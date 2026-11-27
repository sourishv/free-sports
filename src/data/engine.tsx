import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { fetchGameDetail, type GameDetail } from '../lib/espn';
import { gradeMarket, type Grade } from '../lib/markets';
import { claimDuel, gradeBet, settleBet, settleDuel, voidDuel } from './api';
import { useQuery } from './hooks';
import type { BetDoc, DuelDoc, UserDoc } from './types';

export interface Celebration {
  id: string;
  title: string;
  subtitle: string;
  result: 'won' | 'lost' | 'push';
  amount: number;
  bonus: number;
  streak: number;
  achievements: string[];
  link?: string;
}

interface EngineState {
  duels: DuelDoc[];
  bets: BetDoc[];
  celebrations: Celebration[];
  dismiss: (id: string) => void;
  celebrate: (c: Omit<Celebration, 'id'>) => void;
  refresh: () => void;
}

const Ctx = createContext<EngineState>({ duels: [], bets: [], celebrations: [], dismiss: () => {}, celebrate: () => {}, refresh: () => {} });
export const useEngine = () => useContext(Ctx);

/** Grades a slate duel. Returns null when not final. */
export function gradeSlate(d: DuelDoc, details: Record<string, GameDetail | null>) {
  const games = d.slate?.games ?? [];
  const scores: Record<string, number> = Object.fromEntries(d.participantIds.map((u) => [u, 0]));
  let final = true;
  const perGame: Record<string, string[]> = {};
  for (const sg of games) {
    const det = details[sg.game.eventId];
    const g = det?.game;
    if (!g) {
      final = false;
      continue;
    }
    const grade = gradeMarket(d.slate?.ats ? { type: 'spread', line: sg.spread ?? 0 } : { type: 'ml' }, g, det);
    if (!grade) {
      final = false;
      continue;
    }
    if (!grade.final) final = false;
    perGame[sg.game.eventId] = grade.winners;
    for (const u of d.participantIds) {
      const p = d.participants[u]?.picks?.[sg.game.eventId];
      if (p && grade.winners.includes(p)) scores[u] += 1;
    }
  }
  return { final, scores, perGame };
}

export async function tryResolveDuel(d: DuelDoc, by: string): Promise<boolean> {
  if (d.status !== 'open' || Date.now() < d.locksAt) return false;
  if (d.participantIds.length < 2) {
    await voidDuel(d, by, 'Nobody else joined before lock — buy-in refunded');
    return true;
  }
  if (d.kind === 'game' && d.game && d.market) {
    const det = await fetchGameDetail(d.game.league, d.game.eventId, d.game.date, 30_000);
    if (!det) return false;
    const g: Grade | null = gradeMarket(d.market, det.game, det);
    if (!g?.final) return false;
    return settleDuel(d, by, { winners: g.winners, summary: g.summary, void: g.void || g.push });
  }
  if (d.kind === 'slate' && d.slate) {
    const details: Record<string, GameDetail | null> = {};
    await Promise.all(
      d.slate.games.map(async (sg) => {
        details[sg.game.eventId] = await fetchGameDetail(sg.game.league, sg.game.eventId, sg.game.date, 30_000).catch(() => null);
      }),
    );
    const r = gradeSlate(d, details);
    if (!r.final) return false;
    const best = Math.max(...Object.values(r.scores));
    const leaders = Object.entries(r.scores)
      .filter(([, s]) => s === best)
      .map(([u]) => d.participants[u]?.name ?? '?');
    return settleDuel(d, by, {
      winners: [],
      scores: r.scores,
      summary: `${leaders.join(' & ')} ${leaders.length > 1 ? 'tie' : 'wins'} with ${best}/${d.slate.games.length} correct`,
    });
  }
  return false;
}

export function EngineProvider({ me, children }: { me: UserDoc; children: ReactNode }) {
  const { docs: duels } = useQuery<DuelDoc>('duels', { where: [['participantIds', 'array-contains', me.id]] });
  const { docs: bets } = useQuery<BetDoc>('bets', { where: [['uid', '==', me.id]] });
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const busy = useRef(false);
  const claiming = useRef(new Set<string>());
  const [tick, setTick] = useState(0);

  const celebrate = useCallback((c: Omit<Celebration, 'id'>) => setCelebrations((cs) => [...cs, { ...c, id: Math.random().toString(36).slice(2) }]), []);
  const dismiss = useCallback((id: string) => setCelebrations((cs) => cs.filter((c) => c.id !== id)), []);

  // collect payouts from finished duels
  useEffect(() => {
    for (const d of duels) {
      const p = d.participants[me.id];
      if (d.status === 'open' || !p || p.claimed || claiming.current.has(d.id)) continue;
      claiming.current.add(d.id);
      claimDuel(me.id, d.id)
        .then((r) => {
          if (!r) return;
          celebrate({
            title: d.status === 'void' ? 'Duel refunded' : r.result === 'won' ? 'You won the duel!' : r.result === 'lost' ? 'Duel lost' : 'Push — money back',
            subtitle: `${d.title}${d.result?.summary ? ` · ${d.result.summary}` : ''}`,
            result: r.result,
            amount: r.result === 'lost' ? r.profit : r.result === 'won' ? r.profit : r.payout,
            bonus: r.bonus,
            streak: r.streak,
            achievements: r.newAchievements,
            link: `/duel/${d.id}`,
          });
        })
        .catch((e) => {
          console.warn('claim failed', e);
          claiming.current.delete(d.id);
        });
    }
  }, [duels, me.id, celebrate]);

  // settle finished games (any participant can do it; transactions make it idempotent)
  useEffect(() => {
    const run = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        for (const d of duels) {
          if (d.status === 'open' && Date.now() >= d.locksAt && d.kind !== 'custom') await tryResolveDuel(d, me.id).catch((e) => console.warn(e));
          else if (d.status === 'open' && d.kind === 'custom' && Date.now() >= d.locksAt && d.participantIds.length < 2)
            await voidDuel(d, me.id, 'Nobody else joined before lock — buy-in refunded').catch(() => {});
        }
        for (const b of bets) {
          if (b.status !== 'open') continue;
          if (b.legs.every((l) => Date.parse(l.game.date) > Date.now())) continue;
          const grades = await Promise.all(
            b.legs.map(async (l) => {
              const det = await fetchGameDetail(l.game.league, l.game.eventId, l.game.date, 30_000).catch(() => null);
              return det ? gradeMarket(l.market, det.game, det) : null;
            }),
          );
          const g = gradeBet(b, grades);
          if (!g) continue;
          const info = await settleBet(b, g);
          if (info) {
            celebrate({
              title: info.result === 'won' ? (b.kind === 'parlay' ? 'Parlay hit! 🎯' : 'Bet won!') : info.result === 'lost' ? 'Bet lost' : 'Bet pushed',
              subtitle: b.legs.map((l) => l.label).join(' + '),
              result: info.result,
              amount: info.result === 'push' ? b.stake : info.profit,
              bonus: info.bonus,
              streak: info.streak,
              achievements: info.newAchievements,
              link: '/me?tab=bets',
            });
          }
        }
      } finally {
        busy.current = false;
      }
    };
    run();
    const t = setInterval(run, 45_000);
    return () => clearInterval(t);
  }, [duels, bets, me.id, celebrate, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return <Ctx.Provider value={{ duels, bets, celebrations, dismiss, celebrate, refresh }}>{children}</Ctx.Provider>;
}
