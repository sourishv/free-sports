import { CRATE_PRICE, FREE_ITEMS, ITEM_MAP, randomStarterAvatar, rollCrate, type AvatarConfig, type Item, type Slot } from '../avatar/items';
import { GAME } from '../config';
import { parlayDecimal, toAmerican, toDecimal } from '../lib/odds';
import { computePayouts, slatePayouts } from '../lib/payouts';
import type { Grade } from '../lib/markets';
import { ACH_MAP } from './achievements';
import { store } from './index';
import { inc, randomId, union, type Patch, type Tx } from './store';
import type { BetDoc, BetLeg, DuelDoc, MessageDoc, Participant, Stats, UserDoc } from './types';

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const levelFor = (xp: number) => Math.floor(Math.sqrt(xp / 60)) + 1;
export const xpForLevel = (lvl: number) => (lvl - 1) ** 2 * 60;

const emptyStats = (): Stats => ({
  wins: 0,
  losses: 0,
  pushes: 0,
  streak: 0,
  bestStreak: 0,
  wagered: 0,
  profit: 0,
  biggestWin: 0,
  duelsPlayed: 0,
  duelsWon: 0,
  betsPlayed: 0,
  betsWon: 0,
  parlaysHit: 0,
});

export const makeHandle = (name: string) =>
  (name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'player') + Math.floor(1000 + Math.random() * 9000);

export function newUser(uid: string, name: string, extra: Partial<UserDoc> = {}): UserDoc {
  return {
    id: uid,
    name: name.trim().slice(0, 20) || 'Player',
    handle: makeHandle(name),
    avatar: randomStarterAvatar(),
    coins: GAME.startingCoins,
    owned: [...FREE_ITEMS],
    stats: emptyStats(),
    friends: [],
    daily: { last: '', streak: 0 },
    achievements: [],
    xp: 0,
    bailouts: 0,
    createdAt: Date.now(),
    ...extra,
  };
}

export async function createProfile(uid: string, name: string, avatar?: AvatarConfig) {
  const u = newUser(uid, name);
  if (avatar) u.avatar = avatar;
  await store.set('users', uid, u);
  return u;
}

/* ---------- achievements & results ---------- */

/** Adds achievement unlocks (+ coin rewards + reward items) to a patch. Returns the list of new achievement ids. */
function grantAchievements(u: UserDoc, ids: string[], patch: Patch): string[] {
  const fresh = ids.filter((id) => !u.achievements.includes(id) && ACH_MAP[id]);
  if (!fresh.length) return [];
  patch['achievements'] = union(...fresh);
  const coins = fresh.reduce((a, id) => a + (ACH_MAP[id].coins ?? 0), 0);
  const items = fresh.map((id) => ACH_MAP[id].reward).filter(Boolean) as string[];
  if (items.length) patch['owned'] = union(...items);
  if (coins) patch['coins'] = addInc(patch['coins'], coins);
  return fresh;
}

const addInc = (cur: unknown, n: number) => inc(((cur as { n?: number })?.n ?? 0) + n);

export interface Outcome {
  stake: number;
  payout: number;
  kind: 'bet' | 'parlay' | 'duel';
  odds?: number;
  legs?: number;
  players?: number;
}

export interface ResultInfo {
  result: 'won' | 'lost' | 'push';
  profit: number;
  bonus: number;
  newAchievements: string[];
  streak: number;
}

/** Builds the user patch for a settled wager: coins, stats, streaks, xp, heat-check bonus, achievements. */
export function resultPatch(u: UserDoc, o: Outcome): { patch: Patch; info: ResultInfo } {
  const profit = o.payout - o.stake;
  const result: ResultInfo['result'] = profit > 0 ? 'won' : profit < 0 ? 'lost' : 'push';
  const s = u.stats ?? emptyStats();
  const patch: Patch = {};
  let streak = s.streak;
  let bonus = 0;
  const ach: string[] = [];

  if (result === 'won') {
    streak = streak > 0 ? streak + 1 : 1;
    // 🔥 Heat check: 3+ straight wins pays a bonus on profit (+10% per win past 2, max +50%)
    if (streak >= 3) bonus = Math.floor(profit * Math.min(0.1 * (streak - 2), 0.5));
    patch['stats.wins'] = inc(1);
    if (profit > s.biggestWin) patch['stats.biggestWin'] = profit;
    if (streak > s.bestStreak) patch['stats.bestStreak'] = streak;
    patch['xp'] = inc(30);
    ach.push('first_win');
    if (streak >= 3) ach.push('streak3');
    if (streak >= 5) ach.push('streak5');
    if (streak >= 10) ach.push('streak10');
    if ((o.odds ?? 0) >= 250) ach.push('underdog');
    if (o.kind === 'parlay') {
      patch['stats.parlaysHit'] = inc(1);
      if ((o.legs ?? 0) >= 3) ach.push('parlay3');
    }
    if (o.kind === 'duel') {
      patch['stats.duelsWon'] = inc(1);
      if (s.duelsWon + 1 >= 5) ach.push('duel_win5');
    } else patch['stats.betsWon'] = inc(1);
  } else if (result === 'lost') {
    streak = streak < 0 ? streak - 1 : -1;
    patch['stats.losses'] = inc(1);
    patch['xp'] = inc(5);
  } else {
    patch['stats.pushes'] = inc(1);
  }
  if (o.kind === 'duel' && (o.players ?? 0) >= 5) ach.push('big_party');
  patch['stats.streak'] = streak;
  patch['stats.profit'] = inc(profit + bonus);
  patch['coins'] = inc(o.payout + bonus);
  if (u.coins + o.payout + bonus >= 10000) ach.push('rich');
  const newAchievements = grantAchievements(u, ach, patch);
  return { patch, info: { result, profit: profit + bonus, bonus, newAchievements, streak } };
}

function wagerPatch(u: UserDoc, stake: number, kind: 'bet' | 'duel'): Patch {
  if (u.coins < stake) throw new Error(`Not enough coins — you have ${u.coins.toLocaleString()}.`);
  const patch: Patch = {
    coins: inc(-stake),
    'stats.wagered': inc(stake),
    [kind === 'duel' ? 'stats.duelsPlayed' : 'stats.betsPlayed']: inc(1),
    xp: inc(Math.min(100, Math.max(5, Math.round(stake / 10)))),
  };
  if (stake >= 1000) grantAchievements(u, ['high_roller'], patch);
  return patch;
}

async function getUser(t: Tx, uid: string) {
  const u = await t.get<UserDoc>('users', uid);
  if (!u) throw new Error('Profile not found');
  return u;
}

/* ---------- daily / bailout / profile ---------- */

export const dailyAvailable = (u: UserDoc) => u.daily?.last !== todayKey();

export function nextDailyStreak(u: UserDoc) {
  const y = todayKey(new Date(Date.now() - 86400000));
  return u.daily?.last === y ? (u.daily.streak % 7) + 1 : 1;
}

export async function claimDaily(uid: string) {
  return store.tx(async (t) => {
    const u = await getUser(t, uid);
    if (!dailyAvailable(u)) throw new Error('Already claimed today');
    const streak = nextDailyStreak(u);
    const amount = GAME.dailyRewards[streak - 1];
    const patch: Patch = { coins: inc(amount), daily: { last: todayKey(), streak }, xp: inc(10) };
    const ach = streak === 7 ? grantAchievements(u, ['daily7'], patch) : [];
    t.update('users', uid, patch);
    return { amount, streak, ach };
  });
}

export const bailoutAvailable = (u: UserDoc, openWagers: number) =>
  u.coins < GAME.bailoutBelow && openWagers === 0 && u.lastBailout !== todayKey();

export async function takeBailout(uid: string) {
  return store.tx(async (t) => {
    const u = await getUser(t, uid);
    if (u.coins >= GAME.bailoutBelow || u.lastBailout === todayKey()) throw new Error('Bailout not available');
    const patch: Patch = { coins: inc(GAME.bailoutAmount), bailouts: inc(1), lastBailout: todayKey() };
    if ((u.bailouts ?? 0) + 1 >= 3) grantAchievements(u, ['bailout3'], patch);
    t.update('users', uid, patch);
  });
}

export async function updateProfile(uid: string, patch: { name?: string; avatar?: Partial<AvatarConfig> }) {
  const p: Patch = {};
  if (patch.name !== undefined) p.name = patch.name.trim().slice(0, 20) || 'Player';
  for (const [k, v] of Object.entries(patch.avatar ?? {})) p[`avatar.${k}`] = v;
  await store.update('users', uid, p);
}

/* ---------- shop ---------- */

export async function buyItem(uid: string, itemId: string) {
  const item = ITEM_MAP[itemId];
  if (!item || item.unlock) throw new Error('Not for sale');
  return store.tx(async (t) => {
    const u = await getUser(t, uid);
    if (u.owned.includes(itemId)) throw new Error('Already owned');
    if (u.coins < item.price) throw new Error('Not enough coins');
    const patch: Patch = { coins: inc(-item.price), owned: union(itemId), [`avatar.${item.slot}`]: itemId };
    if (u.owned.filter((i) => ITEM_MAP[i]?.price > 0 || ITEM_MAP[i]?.unlock).length + 1 >= 25) grantAchievements(u, ['collector'], patch);
    t.update('users', uid, patch);
  });
}

export async function openCrate(uid: string): Promise<Item> {
  return store.tx(async (t) => {
    const u = await getUser(t, uid);
    if (u.coins < CRATE_PRICE) throw new Error('Not enough coins');
    const item = rollCrate(u.owned);
    if (!item) throw new Error('You own everything already. Legend.');
    t.update('users', uid, { coins: inc(-CRATE_PRICE), owned: union(item.id) });
    return item;
  });
}

export async function equip(uid: string, slot: Slot, itemId: string) {
  await store.update('users', uid, { [`avatar.${slot}`]: itemId });
}

/* ---------- friends ---------- */

export async function findByHandle(handle: string) {
  const h = handle.trim().replace(/^@/, '').toLowerCase();
  const r = await store.query<UserDoc>('users', { where: [['handle', '==', h]], limit: 1 });
  return r[0] ?? null;
}

/** Friendship is mutual: each side adds the other's uid (rules allow adding yourself to someone's list). */
export async function addFriend(me: UserDoc, other: UserDoc) {
  if (other.id === me.id) throw new Error("That's you!");
  await store.update('users', me.id, { friends: union(other.id) });
  await store.update('users', other.id, { friends: union(me.id) }).catch(() => {});
  if ((me.friends?.length ?? 0) + 1 >= 3) {
    const p: Patch = {};
    if (grantAchievements(me, ['social'], p).length) await store.update('users', me.id, p);
  }
}

/* ---------- sportsbook (vs the house) ---------- */

export function betOdds(legs: Pick<BetLeg, 'odds'>[]) {
  if (legs.length === 1) return legs[0].odds;
  return toAmerican(parlayDecimal(legs.map((l) => l.odds)));
}

export async function placeBet(uid: string, legs: BetLeg[], stake: number) {
  if (!legs.length) throw new Error('Add a pick first');
  stake = Math.floor(stake);
  if (!(stake >= GAME.minStake)) throw new Error('Enter a stake');
  if (stake > GAME.maxStake) throw new Error(`Max stake is ${GAME.maxStake.toLocaleString()}`);
  const kind = legs.length > 1 ? 'parlay' : 'straight';
  const ids = new Set(legs.map((l) => l.game.eventId));
  if (kind === 'parlay' && ids.size !== legs.length) throw new Error('Parlay legs must be from different games');
  const odds = betOdds(legs);
  const dec = legs.length === 1 ? toDecimal(odds) : parlayDecimal(legs.map((l) => l.odds));
  const toWin = Math.floor(stake * (dec - 1));
  const id = store.newId('bets');
  await store.tx(async (t) => {
    const u = await getUser(t, uid);
    t.update('users', uid, wagerPatch(u, stake, 'bet'));
    const bet: BetDoc = { id, uid, kind, legs, stake, odds, toWin, status: 'open', placedAt: Date.now() };
    t.set('bets', id, bet);
  });
  return id;
}

/** Grades an open bet given each leg's grade (null = not started). Returns null if it can't be settled yet. */
export function gradeBet(bet: BetDoc, grades: (Grade | null)[]): { status: BetDoc['status']; payout: number; legs: BetLeg[] } | null {
  const legs = bet.legs.map((l, i) => {
    const g = grades[i];
    if (!g || !g.final) return { ...l };
    const result: BetLeg['result'] = g.void ? 'void' : g.push ? 'push' : g.winners.includes(l.pick) ? 'won' : 'lost';
    return { ...l, result };
  });
  if (legs.some((l) => l.result === 'lost')) return { status: 'lost', payout: 0, legs };
  if (legs.some((l) => !l.result)) return null;
  const live = legs.filter((l) => l.result === 'won');
  if (!live.length) return { status: 'push', payout: bet.stake, legs };
  const dec = live.reduce((a, l) => a * toDecimal(l.odds), 1);
  return { status: 'won', payout: Math.floor(bet.stake * dec), legs };
}

export async function settleBet(bet: BetDoc, graded: NonNullable<ReturnType<typeof gradeBet>>) {
  return store.tx(async (t) => {
    const fresh = await t.get<BetDoc>('bets', bet.id);
    if (!fresh || fresh.status !== 'open') return null;
    const u = await getUser(t, bet.uid);
    const { patch, info } = resultPatch(u, {
      stake: bet.stake,
      payout: graded.payout,
      kind: bet.kind === 'parlay' ? 'parlay' : 'bet',
      // underdog badge needs a single long-shot pick; parlay badge counts legs that actually won
      odds: bet.kind === 'parlay' ? undefined : bet.odds,
      legs: graded.legs.filter((l) => l.result === 'won').length,
    });
    t.update('users', bet.uid, patch);
    t.update('bets', bet.id, { status: graded.status, payout: graded.payout, legs: graded.legs, settledAt: Date.now(), bonus: info.bonus });
    return info;
  });
}

/* ---------- duels ---------- */

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

export type DuelDraft = Omit<DuelDoc, 'id' | 'code' | 'hostUid' | 'hostName' | 'createdAt' | 'status' | 'participants' | 'participantIds'>;

const participantFor = (u: UserDoc, stake: number, choice: { pick?: string; picks?: Participant['picks']; odds?: number }): Participant => ({
  name: u.name,
  avatar: u.avatar,
  stake,
  joinedAt: Date.now(),
  ...(choice.pick !== undefined ? { pick: choice.pick } : {}),
  ...(choice.picks ? { picks: choice.picks } : {}),
  ...(choice.odds !== undefined ? { odds: choice.odds } : {}),
});

export async function createDuel(uid: string, draft: DuelDraft, choice: { pick?: string; picks?: Participant['picks']; odds?: number }) {
  const id = store.newId('duels');
  await store.tx(async (t) => {
    const u = await getUser(t, uid);
    const duel: DuelDoc = {
      ...draft,
      id,
      code: makeCode(),
      hostUid: uid,
      hostName: u.name,
      createdAt: Date.now(),
      status: 'open',
      participants: { [uid]: participantFor(u, draft.buyIn, choice) },
      participantIds: [uid],
    };
    t.update('users', uid, wagerPatch(u, draft.buyIn, 'duel'));
    t.set('duels', id, duel);
  });
  await postSystem(id, `Duel created. Buy-in ${draft.buyIn.toLocaleString()} 🪙 — may the sharpest win.`);
  return id;
}

export const isLocked = (d: DuelDoc) => d.status !== 'open' || Date.now() >= d.locksAt;

export async function joinDuel(uid: string, duelId: string, choice: { pick?: string; picks?: Participant['picks']; odds?: number }) {
  const name = await store.tx(async (t) => {
    const d = await t.get<DuelDoc>('duels', duelId);
    const u = await getUser(t, uid);
    if (!d) throw new Error('Duel not found');
    if (d.participants[uid]) throw new Error("You're already in");
    if (isLocked(d)) throw new Error('This duel is locked');
    if (d.maxPlayers && d.participantIds.length >= d.maxPlayers) throw new Error('Duel is full');
    t.update('users', uid, { ...wagerPatch(u, d.buyIn, 'duel'), friends: union(d.hostUid) });
    t.update('duels', duelId, { [`participants.${uid}`]: participantFor(u, d.buyIn, choice), participantIds: union(uid) });
    return u.name;
  });
  // become friends with the host (host's list is updated by the host's own client as well)
  const d = await store.get<DuelDoc>('duels', duelId);
  if (d) await store.update('users', d.hostUid, { friends: union(uid) }).catch(() => {});
  await postSystem(duelId, `${name} joined the duel 💪`);
}

export async function changePick(uid: string, duelId: string, choice: { pick?: string; picks?: Participant['picks']; odds?: number }) {
  await store.tx(async (t) => {
    const d = await t.get<DuelDoc>('duels', duelId);
    if (!d?.participants[uid]) throw new Error('Not in this duel');
    if (isLocked(d)) throw new Error('Picks are locked');
    const p: Patch = {};
    if (choice.pick !== undefined) p[`participants.${uid}.pick`] = choice.pick;
    if (choice.picks) p[`participants.${uid}.picks`] = choice.picks;
    if (choice.odds !== undefined) p[`participants.${uid}.odds`] = choice.odds;
    t.update('duels', duelId, p);
  });
}

/** Host cancels (or nobody joined by lock time) → everyone is refunded via the claim flow. */
export async function voidDuel(duel: DuelDoc, by: string, summary = 'Duel canceled — everyone refunded') {
  await store.tx(async (t) => {
    const d = await t.get<DuelDoc>('duels', duel.id);
    if (!d || d.status !== 'open') return;
    const payouts = Object.fromEntries(Object.entries(d.participants).map(([u, p]) => [u, p.stake]));
    t.update('duels', d.id, { status: 'void', payouts, result: { winners: [], summary, settledAt: Date.now(), settledBy: by } });
  });
}

export function duelEntries(d: DuelDoc) {
  return Object.entries(d.participants).map(([uid, p]) => ({ uid, stake: p.stake, pick: p.pick ?? '', odds: p.odds }));
}

export async function settleDuel(duel: DuelDoc, by: string, outcome: { winners: string[]; summary: string; void?: boolean; scores?: Record<string, number> }) {
  return store.tx(async (t) => {
    const d = await t.get<DuelDoc>('duels', duel.id);
    if (!d || d.status !== 'open') return false;
    let payouts: Record<string, number>;
    if (outcome.void) payouts = Object.fromEntries(Object.entries(d.participants).map(([u, p]) => [u, p.stake]));
    else if (d.kind === 'slate' && outcome.scores)
      payouts = slatePayouts(Object.fromEntries(Object.entries(d.participants).map(([u, p]) => [u, p.stake])), outcome.scores);
    else payouts = computePayouts(duelEntries(d), outcome.winners, d.payoutMode);
    t.update('duels', d.id, {
      status: outcome.void ? 'void' : 'settled',
      payouts,
      result: { winners: outcome.winners, summary: outcome.summary, settledAt: Date.now(), settledBy: by, ...(outcome.scores ? { scores: outcome.scores } : {}) },
    });
    return true;
  }).then(async (ok) => {
    if (ok) await postSystem(duel.id, `🏁 Final: ${outcome.summary}`);
    return ok;
  });
}

/** Each player collects their own payout (so nobody ever writes to another person's balance). */
export async function claimDuel(uid: string, duelId: string): Promise<(ResultInfo & { payout: number; duel: DuelDoc }) | null> {
  return store.tx(async (t) => {
    const d = await t.get<DuelDoc>('duels', duelId);
    const u = await getUser(t, uid);
    const me = d?.participants[uid];
    if (!d || !me || me.claimed || d.status === 'open' || !d.payouts) return null;
    const payout = d.payouts[uid] ?? 0;
    let patch: Patch;
    let info: ResultInfo;
    if (d.status === 'void') {
      patch = { coins: inc(payout), 'stats.duelsPlayed': inc(-1), 'stats.wagered': inc(-me.stake) };
      info = { result: 'push', profit: 0, bonus: 0, newAchievements: [], streak: u.stats.streak };
    } else {
      ({ patch, info } = resultPatch(u, { stake: me.stake, payout, kind: 'duel', odds: me.odds, players: d.participantIds.length }));
    }
    t.update('users', uid, patch);
    t.update('duels', duelId, { [`participants.${uid}.claimed`]: true });
    return { ...info, payout: payout + info.bonus, duel: d };
  });
}

export async function findDuelByCode(code: string) {
  const r = await store.query<DuelDoc>('duels', { where: [['code', '==', code.trim().toUpperCase()]], limit: 1 });
  return r[0] ?? null;
}

/* ---------- chat ---------- */

export async function sendMessage(duelId: string, u: Pick<UserDoc, 'id' | 'name' | 'avatar'>, text: string) {
  const clean = text.trim().slice(0, 280);
  if (!clean) return;
  const id = store.newId(`duels/${duelId}/messages`);
  const m: MessageDoc = { id, uid: u.id, name: u.name, avatar: u.avatar, text: clean, createdAt: Date.now() };
  await store.set(`duels/${duelId}/messages`, id, m);
}

export async function postSystem(duelId: string, text: string) {
  const id = store.newId(`duels/${duelId}/messages`) + randomId(4);
  const m: MessageDoc = { id, uid: 'system', name: 'Ref', text, createdAt: Date.now(), system: true };
  await store.set(`duels/${duelId}/messages`, id, m).catch(() => {});
}
