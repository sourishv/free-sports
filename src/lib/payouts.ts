import { toDecimal } from './odds';

export interface Entry {
  uid: string;
  stake: number;
  pick: string;
  odds?: number; // american odds locked at join (odds mode)
}

export type PayoutMode = 'pot' | 'odds';

/** Split `amount` integer coins by weights, flooring and handing leftover coins to the largest weights. */
function split(amount: number, weights: { uid: string; w: number }[]): Record<string, number> {
  const total = weights.reduce((a, b) => a + b.w, 0);
  const out: Record<string, number> = {};
  if (total <= 0 || amount <= 0) {
    weights.forEach((x) => (out[x.uid] = 0));
    return out;
  }
  let given = 0;
  for (const x of weights) {
    out[x.uid] = Math.floor((amount * x.w) / total);
    given += out[x.uid];
  }
  const order = [...weights].sort((a, b) => b.w - a.w || a.uid.localeCompare(b.uid));
  for (let i = 0; given < amount; i = (i + 1) % order.length, given++) out[order[i].uid] += 1;
  return out;
}

/**
 * Returns the total coins returned to each player (stake included).
 *  - void / push / nobody right / everybody right → everyone gets their stake back
 *  - pot: winners split the whole pot in proportion to their stakes
 *  - odds: each winner is owed stake × (decimal − 1) from the losers' money, like a sportsbook.
 *    If the losers can't cover it, winners share what's there pro-rata; anything left over goes back to losers.
 */
export function computePayouts(entries: Entry[], winners: string[] | null, mode: PayoutMode): Record<string, number> {
  const refund = Object.fromEntries(entries.map((e) => [e.uid, e.stake]));
  if (!winners || winners.length === 0) return refund;
  const W = entries.filter((e) => winners.includes(e.pick));
  const Lz = entries.filter((e) => !winners.includes(e.pick));
  if (W.length === 0 || Lz.length === 0) return refund;

  const losersPool = Lz.reduce((a, e) => a + e.stake, 0);
  const out: Record<string, number> = Object.fromEntries(entries.map((e) => [e.uid, 0]));

  if (mode === 'pot') {
    const s = split(losersPool, W.map((e) => ({ uid: e.uid, w: e.stake })));
    W.forEach((e) => (out[e.uid] = e.stake + s[e.uid]));
    return out;
  }

  const claims = W.map((e) => ({ uid: e.uid, w: e.stake * (toDecimal(e.odds ?? 100) - 1) }));
  const owed = claims.reduce((a, c) => a + c.w, 0);
  if (owed >= losersPool) {
    const s = split(losersPool, claims);
    W.forEach((e) => (out[e.uid] = e.stake + s[e.uid]));
    return out;
  }
  const paid: Record<string, number> = {};
  claims.forEach((c) => (paid[c.uid] = Math.floor(c.w)));
  const paidTotal = Object.values(paid).reduce((a, b) => a + b, 0);
  W.forEach((e) => (out[e.uid] = e.stake + paid[e.uid]));
  const back = split(losersPool - paidTotal, Lz.map((e) => ({ uid: e.uid, w: e.stake })));
  Lz.forEach((e) => (out[e.uid] = back[e.uid]));
  return out;
}

/** Pick'em slate: whoever has the most correct picks splits the pot. */
export function slatePayouts(stakes: Record<string, number>, scores: Record<string, number>): Record<string, number> {
  const uids = Object.keys(stakes);
  const best = Math.max(...uids.map((u) => scores[u] ?? 0));
  const winners = uids.filter((u) => (scores[u] ?? 0) === best);
  const entries = uids.map((u) => ({ uid: u, stake: stakes[u], pick: winners.includes(u) ? 'W' : 'L' }));
  return computePayouts(entries, ['W'], 'pot');
}
