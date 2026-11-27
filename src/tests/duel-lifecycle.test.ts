// End-to-end money flow on the in-browser store: create → join → settle → everyone claims.
import { describe, expect, it } from 'vitest';
import { claimDuel, createDuel, createProfile, gradeBet, joinDuel, placeBet, settleBet, settleDuel, voidDuel } from '../data/api';
import { store } from '../data/index';
import type { BetLeg, DuelDoc, UserDoc } from '../data/types';

const coins = async (uid: string) => (await store.get<UserDoc>('users', uid))!.coins;
const ref = {
  eventId: 'e1',
  league: 'nfl',
  date: new Date(Date.now() + 3600_000).toISOString(),
  name: 'A at H',
  shortName: 'A @ H',
  home: { id: 'h', abbr: 'H', name: 'Home' },
  away: { id: 'a', abbr: 'A', name: 'Away' },
};

describe('duel lifecycle', () => {
  it('moves coins correctly between three players', async () => {
    await createProfile('u1', 'One');
    await createProfile('u2', 'Two');
    await createProfile('u3', 'Three');
    const id = await createDuel(
      'u1',
      {
        kind: 'game',
        title: 'test',
        locksAt: Date.now() + 3600_000,
        buyIn: 200,
        payoutMode: 'pot',
        maxPlayers: 0,
        league: 'nfl',
        game: ref,
        market: { type: 'spread', line: -3.5 },
        marketTitle: 'Spread',
        options: [
          { id: 'away', label: 'A +3.5' },
          { id: 'home', label: 'H -3.5' },
        ],
      },
      { pick: 'home' },
    );
    await joinDuel('u2', id, { pick: 'away' });
    await joinDuel('u3', id, { pick: 'away' });
    await expect(joinDuel('u3', id, { pick: 'away' })).rejects.toThrow(/already/);
    expect(await coins('u1')).toBe(800);

    const d = (await store.get<DuelDoc>('duels', id))!;
    expect(await settleDuel(d, 'u2', { winners: ['home'], summary: 'H covers' })).toBe(true);
    expect(await settleDuel(d, 'u3', { winners: ['away'], summary: 'double settle' })).toBe(false); // idempotent

    const r1 = await claimDuel('u1', id);
    await claimDuel('u2', id);
    await claimDuel('u3', id);
    expect(await claimDuel('u1', id)).toBeNull(); // can't claim twice
    expect(r1?.result).toBe('won');
    expect(await coins('u1')).toBe(1400 + 100); // +100 'First Blood' achievement
    expect(await coins('u2')).toBe(800);
    expect(await coins('u3')).toBe(800);
    const u1 = (await store.get<UserDoc>('users', 'u1'))!;
    expect(u1.stats).toMatchObject({ wins: 1, duelsWon: 1, streak: 1, profit: 400 });
    expect(u1.achievements).toContain('first_win');
  });

  it('voided duels refund everyone without touching records', async () => {
    await createProfile('v1', 'V1');
    await createProfile('v2', 'V2');
    const id = await createDuel(
      'v1',
      { kind: 'custom', title: 'MVP?', locksAt: Date.now() + 3600_000, buyIn: 300, payoutMode: 'pot', maxPlayers: 2, options: [{ id: 'o0', label: 'X' }, { id: 'o1', label: 'Y' }] },
      { pick: 'o0' },
    );
    await joinDuel('v2', id, { pick: 'o1' });
    await voidDuel((await store.get<DuelDoc>('duels', id))!, 'v1');
    await claimDuel('v1', id);
    await claimDuel('v2', id);
    expect(await coins('v1')).toBe(1000);
    expect(await coins('v2')).toBe(1000);
    expect((await store.get<UserDoc>('users', 'v1'))!.stats.duelsPlayed).toBe(0);
  });

  it('parlays pay the product of the odds, with a void leg dropped', async () => {
    await createProfile('p1', 'Parlay');
    const leg = (id: string, odds: number): BetLeg => ({ game: { ...ref, eventId: id }, market: { type: 'ml' }, marketTitle: 'ML', pick: 'home', label: 'H', odds });
    const betId = await placeBet('p1', [leg('g1', 100), leg('g2', 100), leg('g3', -200)], 100);
    const bet = (await store.get<import('../data/types').BetDoc>('bets', betId))!;
    expect(bet.toWin).toBe(500); // 2 × 2 × 1.5 = 6x
    const win = { final: true, void: false, push: false, winners: ['home'], summary: '' };
    const graded = gradeBet(bet, [win, win, { ...win, void: true, winners: [] }])!;
    expect(graded).toMatchObject({ status: 'won', payout: 400 });
    const info = await settleBet(bet, graded);
    expect(info?.newAchievements).toEqual(['first_win']); // only 2 legs won → no 3-leg parlay badge
    expect(await coins('p1')).toBe(900 + 400 + 100);
    expect(gradeBet(bet, [win, null, null])).toBeNull();
    expect(gradeBet(bet, [{ ...win, winners: ['away'] }, null, null])!.status).toBe('lost');
  });

  it('rejects wagers you cannot afford', async () => {
    await createProfile('broke', 'Broke');
    await expect(placeBet('broke', [{ game: ref, market: { type: 'ml' }, marketTitle: 'ML', pick: 'home', label: 'H', odds: 100 }], 5000)).rejects.toThrow(/Not enough/);
  });
});
