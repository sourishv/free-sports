// Demo Mode only: a few bot "friends" who join your duels, talk trash, and collect their winnings.
import { useEffect, useRef } from 'react';
import type { AvatarConfig } from '../avatar/items';
import { fetchScoreboard } from '../lib/espn';
import { buildOptions, gameRef, marketTitle } from '../lib/markets';
import { claimDuel, createDuel, isLocked, joinDuel, newUser, sendMessage } from './api';
import { store } from './index';
import { union } from './store';
import type { DuelDoc, MessageDoc, UserDoc } from './types';

const BOTS: { id: string; name: string; avatar: Partial<AvatarConfig> }[] = [
  { id: 'bot_kev', name: 'Coach Kev', avatar: { skin: 'skin4', hair: 'hair_buzz', hat: 'h_cap', jersey: 'j_black', number: '23', eyes: 'e_focus', mouth: 'm_whistle', title: 't_couch', bg: 'bg_court', frame: 'fr_bronze' } },
  { id: 'bot_tuna', name: 'Big Tuna', avatar: { skin: 'skin2', hair: 'hair_long', hairColor: '#e2b659', jersey: 'j_teal', number: '88', eyes: 'e_happy', mouth: 'm_grin', eyewear: 'g_shades', bg: 'bg_ocean', title: 't_degen' } },
  { id: 'bot_parlay', name: 'Lil Parlay', avatar: { skin: 'skin5', hair: 'hair_afro', hairColor: '#1b1b1b', jersey: 'j_purple', number: '3', eyes: 'e_money', mouth: 'm_grill', hat: 'h_none', bg: 'bg_money', frame: 'fr_gold', effect: 'fx_sparkle', title: 't_bag' } },
  { id: 'bot_ronnie', name: 'Ref Ronnie', avatar: { skin: 'skin1', hair: 'hair_mullet', hairColor: '#b5382c', jersey: 'j_white', number: '0', eyes: 'e_sleepy', mouth: 'm_smirk', face: 'f_stache', bg: 'bg_turf', title: 't_fade' } },
  { id: 'bot_zoe', name: 'Zoe "Ice"', avatar: { skin: 'skin3', hair: 'hair_bun', hairColor: '#4a2c17', jersey: 'j_pink', number: '11', eyes: 'e_wink', mouth: 'm_smile', eyewear: 'g_visor', bg: 'bg_ice', title: 't_sharp', frame: 'fr_silver' } },
];
export const BOT_IDS = BOTS.map((b) => b.id);

const JOIN_LINES = ['Easy money 💰', "I've seen enough. I'm in.", 'Book it.', 'Who set this line? Thank you 🙏', 'Lock of the century 🔒', 'Fading you, as usual', 'My gut says yes', 'Respectfully: lol'];
const CHAT_REPLIES = ['Cope 😂', "We'll see who's talking at the final whistle", 'Screenshot this', '🧢', 'Bold words from someone with your record', '📉📉📉', 'Mute', 'I like your confidence. I like your coins more.', 'lmaooo', 'Not the take I expected'];

const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

async function ensureBots(meId: string) {
  for (const b of BOTS) {
    const existing = await store.get<UserDoc>('users', b.id);
    if (!existing) {
      const u = newUser(b.id, b.name, { isBot: true, coins: 2000 + Math.floor(Math.random() * 6000), friends: [meId] });
      u.avatar = { ...u.avatar, ...b.avatar };
      u.handle = b.name.toLowerCase().replace(/[^a-z]/g, '');
      u.stats.wins = 5 + Math.floor(Math.random() * 30);
      u.stats.losses = 5 + Math.floor(Math.random() * 30);
      u.stats.streak = Math.floor(Math.random() * 7) - 2;
      u.stats.bestStreak = Math.max(3, u.stats.streak);
      u.xp = 200 + Math.floor(Math.random() * 3000);
      await store.set('users', b.id, u);
    } else if (!existing.friends.includes(meId)) {
      await store.update('users', b.id, { friends: union(meId) });
    }
  }
  await store.update('users', meId, { friends: union(...BOT_IDS) });
}

/** Seed an open duel hosted by a bot so there's something to join right away. */
let seeded = false;
async function seedBotDuel() {
  if (seeded) return;
  seeded = true;
  const open = await store.query<DuelDoc>('duels', { where: [['status', '==', 'open']] });
  if (open.some((d) => BOT_IDS.includes(d.hostUid) && !isLocked(d))) return;
  for (const lg of ['nfl', 'nba', 'nhl', 'ncaaf', 'epl', 'ncaam', 'mlb']) {
    const games = await fetchScoreboard(lg).catch(() => []);
    const g = games.find((x) => x.state === 'pre' && Date.parse(x.date) > Date.now() + 15 * 60_000 && x.odds?.spread !== undefined);
    if (!g) continue;
    const bot = rnd(BOTS);
    const market = { type: 'spread' as const, line: g.odds!.spread };
    const options = buildOptions(market, g, g.odds);
    await createDuel(
      bot.id,
      {
        kind: 'game',
        title: `${g.shortName} — who covers?`,
        locksAt: Date.parse(g.date),
        buyIn: 100,
        payoutMode: 'pot',
        maxPlayers: 0,
        league: g.league,
        game: gameRef(g),
        market,
        marketTitle: marketTitle(market, g),
        options,
      },
      { pick: rnd(options).id },
    );
    return;
  }
}

function botChoice(d: DuelDoc) {
  if (d.kind === 'slate' && d.slate) {
    return { picks: Object.fromEntries(d.slate.games.map((sg) => [sg.game.eventId, Math.random() < 0.5 ? 'home' : 'away'])) as Record<string, 'home' | 'away'> };
  }
  const opts = d.options ?? [];
  // bots lean contrarian so duels actually have two sides
  const taken = new Set(Object.values(d.participants).map((p) => p.pick));
  const untaken = opts.filter((o) => !taken.has(o.id));
  const o = untaken.length && Math.random() < 0.7 ? rnd(untaken) : rnd(opts);
  return { pick: o.id, odds: d.payoutMode === 'odds' ? o.odds : undefined };
}

export function useBots(me: UserDoc | null, enabled: boolean) {
  const decided = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || !me) return;
    let alive = true;
    ensureBots(me.id)
      .then(() => seedBotDuel())
      .catch((e) => console.warn('bots', e));

    const timers: number[] = [];
    const unsubDuels = store.watchQuery<DuelDoc>('duels', {}, (duels) => {
      for (const d of duels) {
        // collect winnings
        if (d.status !== 'open') {
          for (const b of BOT_IDS) if (d.participants[b] && !d.participants[b].claimed) claimDuel(b, d.id).catch(() => {});
          continue;
        }
        if (isLocked(d)) continue;
        // decide (once) which bots join this duel
        for (const b of BOTS) {
          const key = `${d.id}:${b.id}`;
          if (decided.current.has(key) || d.participants[b.id]) continue;
          decided.current.add(key);
          const p = d.hostUid === me.id ? 0.75 : 0.35;
          if (Math.random() > p) continue;
          timers.push(
            window.setTimeout(
              async () => {
                if (!alive) return;
                const fresh = await store.get<DuelDoc>('duels', d.id);
                if (!fresh || fresh.participants[b.id] || isLocked(fresh)) return;
                if (fresh.maxPlayers && fresh.participantIds.length >= fresh.maxPlayers) return;
                try {
                  await joinDuel(b.id, d.id, botChoice(fresh));
                  const bu = await store.get<UserDoc>('users', b.id);
                  if (bu && Math.random() < 0.8) await sendMessage(d.id, bu, rnd(JOIN_LINES));
                } catch {
                  /* bot couldn't afford it, whatever */
                }
              },
              2500 + Math.random() * 9000,
            ),
          );
        }
      }
    });
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      unsubDuels();
    };
  }, [enabled, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

}

const lastMsg: Record<string, number> = {};
/** Called by duel chat in Demo Mode: when you talk, a bot in the duel fires back. */
export async function botReply(meId: string, duel: DuelDoc, msgs: MessageDoc[]) {
  const last = msgs[msgs.length - 1];
  if (!last || last.uid !== meId || lastMsg[duel.id] === last.createdAt) return;
  lastMsg[duel.id] = last.createdAt;
  const bots = BOT_IDS.filter((b) => duel.participants[b]);
  if (!bots.length || Math.random() < 0.25) return;
  const b = await store.get<UserDoc>('users', rnd(bots));
  if (b) setTimeout(() => sendMessage(duel.id, b, rnd(CHAT_REPLIES)), 1200 + Math.random() * 2500);
}
