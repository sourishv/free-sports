import { describe, expect, it } from 'vitest';
import type { Game } from '../lib/espn';
import { parseScoreboard } from '../lib/espn';
import { buildOptions, gradeMarket } from '../lib/markets';
import { fmtOdds, parlayDecimal, toAmerican, toDecimal } from '../lib/odds';
import { computePayouts, slatePayouts } from '../lib/payouts';
import { applyPatch, inc, matchQuery, remove, union } from '../data/store';

const game = (over: Partial<Game> = {}, hs = 0, as = 0, hl: number[] = [], al: number[] = []): Game => ({
  id: '1',
  league: 'nfl',
  date: '2026-11-29T18:00Z',
  name: 'A at H',
  shortName: 'A @ H',
  state: 'post',
  completed: true,
  canceled: false,
  detail: 'Final',
  period: 4,
  home: { id: 'h', abbr: 'H', name: 'Home', short: 'Home', score: hs, linescores: hl },
  away: { id: 'a', abbr: 'A', name: 'Away', short: 'Away', score: as, linescores: al },
  ...over,
});

describe('odds math', () => {
  it('converts american <-> decimal', () => {
    expect(toDecimal(150)).toBe(2.5);
    expect(toDecimal(-200)).toBe(1.5);
    expect(toAmerican(2.5)).toBe(150);
    expect(toAmerican(1.5)).toBe(-200);
    expect(fmtOdds(100)).toBe('EVEN');
    expect(parlayDecimal([-110, -110])).toBeCloseTo(3.64, 2);
  });
});

describe('grading', () => {
  it('moneyline, spread with push, total', () => {
    const g = game({}, 24, 21);
    expect(gradeMarket({ type: 'ml' }, g)!.winners).toEqual(['home']);
    expect(gradeMarket({ type: 'spread', line: -3 }, g)!.push).toBe(true);
    expect(gradeMarket({ type: 'spread', line: -3.5 }, g)!.winners).toEqual(['away']);
    expect(gradeMarket({ type: 'spread', line: -2.5 }, g)!.winners).toEqual(['home']);
    expect(gradeMarket({ type: 'total', line: 44.5 }, g)!.winners).toEqual(['over']);
    expect(gradeMarket({ type: 'team_total', team: 'away', line: 20.5 }, g)!.winners).toEqual(['over']);
  });
  it('soccer draws and NFL ties', () => {
    expect(gradeMarket({ type: 'ml' }, game({ league: 'epl' }, 1, 1))!.winners).toEqual(['draw']);
    const tie = gradeMarket({ type: 'ml' }, game({}, 20, 20))!;
    expect(tie.push).toBe(true);
    expect(buildOptions({ type: 'ml' }, game({ league: 'epl' })).map((o) => o.id)).toEqual(['away', 'draw', 'home']);
  });
  it('first half settles early from linescores', () => {
    const g = game({ state: 'in', completed: false, period: 3 }, 17, 10, [7, 10, 0], [3, 7, 0]);
    const r = gradeMarket({ type: 'h1_ml' }, g)!;
    expect(r.final).toBe(true);
    expect(r.winners).toEqual(['home']);
    expect(gradeMarket({ type: 'h1_total', line: 26.5 }, g)!.winners).toEqual(['over']);
  });
  it('live grades are provisional; canceled games void; pregame ungraded', () => {
    expect(gradeMarket({ type: 'ml' }, game({ state: 'in', completed: false }, 3, 0))!.final).toBe(false);
    expect(gradeMarket({ type: 'ml' }, game({ canceled: true }))!.void).toBe(true);
    expect(gradeMarket({ type: 'ml' }, game({ state: 'pre', completed: false }))).toBeNull();
  });
  it('player props from box score, DNP voids', () => {
    const prop = { athleteId: '9', name: 'Star', team: 'H', stat: 'points+rebounds+assists', statLabel: 'PRA' };
    const detail = { game: game(), stats: { '9': { points: 30, rebounds: 8, assists: 5 } }, athletes: [], leaders: [] };
    expect(gradeMarket({ type: 'prop', line: 42.5, prop }, detail.game, detail)!.winners).toEqual(['over']);
    expect(gradeMarket({ type: 'prop', line: 42.5, prop: { ...prop, athleteId: 'x' } }, detail.game, detail)!.void).toBe(true);
  });
});

describe('payouts', () => {
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  it('pot mode: winners split the pot, coins are conserved', () => {
    const e = [
      { uid: 'a', stake: 100, pick: 'x' },
      { uid: 'b', stake: 100, pick: 'y' },
      { uid: 'c', stake: 100, pick: 'y' },
    ];
    const p = computePayouts(e, ['x'], 'pot');
    expect(p).toEqual({ a: 300, b: 0, c: 0 });
    const q = computePayouts(e, ['y'], 'pot');
    expect(q).toEqual({ a: 0, b: 150, c: 150 });
    expect(sum(q)).toBe(300);
  });
  it('refunds on push, void, or one-sided duels', () => {
    const e = [
      { uid: 'a', stake: 100, pick: 'x' },
      { uid: 'b', stake: 100, pick: 'x' },
    ];
    expect(computePayouts(e, ['x'], 'pot')).toEqual({ a: 100, b: 100 });
    expect(computePayouts(e, [], 'pot')).toEqual({ a: 100, b: 100 });
  });
  it('odds mode: favorite wins less, leftover returns to the loser', () => {
    const e = [
      { uid: 'fav', stake: 100, pick: 'h', odds: -200 },
      { uid: 'dog', stake: 100, pick: 'a', odds: 170 },
    ];
    expect(computePayouts(e, ['h'], 'odds')).toEqual({ fav: 150, dog: 50 });
    // underdog is owed 170 but the loser only put in 100
    expect(computePayouts(e, ['a'], 'odds')).toEqual({ fav: 0, dog: 200 });
  });
  it('slates: best score takes the pot, ties split', () => {
    expect(slatePayouts({ a: 100, b: 100, c: 100 }, { a: 5, b: 7, c: 7 })).toEqual({ a: 0, b: 150, c: 150 });
  });
});

describe('local store helpers', () => {
  it('applies dotted patches and field ops', () => {
    const d = { coins: 10, stats: { wins: 1 }, owned: ['a'], p: { x: { claimed: false } } };
    const r = applyPatch(d, { coins: inc(-3), 'stats.wins': inc(1), owned: union('b', 'a'), 'p.x.claimed': true });
    expect(r).toEqual({ coins: 7, stats: { wins: 2 }, owned: ['a', 'b'], p: { x: { claimed: true } } });
    expect(applyPatch(r, { owned: remove('a') }).owned).toEqual(['b']);
    expect(d.coins).toBe(10);
  });
  it('queries', () => {
    const docs = [
      { id: '1', ids: ['a', 'b'], n: 3 },
      { id: '2', ids: ['b'], n: 1 },
    ];
    expect(matchQuery(docs, { where: [['ids', 'array-contains', 'a']] }).map((d) => d.id)).toEqual(['1']);
    expect(matchQuery(docs, { where: [['__id', 'in', ['2']]] }).map((d) => d.id)).toEqual(['2']);
    expect(matchQuery(docs, { orderBy: ['n', 'asc'], limit: 1 })[0].id).toBe('2');
  });
});

describe('ESPN parsing', () => {
  it('parses a scoreboard event with DraftKings-style odds', () => {
    const json = {
      events: [
        {
          id: '9',
          name: 'Miami Heat at New York Knicks',
          shortName: 'MIA @ NY',
          date: '2026-11-28T00:00Z',
          status: { type: { state: 'pre', completed: false, name: 'STATUS_SCHEDULED', shortDetail: '7:00 PM' } },
          competitions: [
            {
              id: '9',
              competitors: [
                { homeAway: 'home', score: '0', team: { id: '18', abbreviation: 'NY', displayName: 'New York Knicks', color: '1d428a' } },
                { homeAway: 'away', score: '0', team: { id: '14', abbreviation: 'MIA', displayName: 'Miami Heat' } },
              ],
              odds: [
                {
                  provider: { displayName: 'DraftKings' },
                  overUnder: 222.5,
                  spread: -4.5,
                  moneyline: { home: { close: { odds: '-180' } }, away: { close: { odds: '+151' } } },
                  pointSpread: { home: { close: { line: '-4.5', odds: '-108' } }, away: { close: { line: '+4.5', odds: '-112' } } },
                  total: { over: { close: { line: 'o222.5', odds: '-113' } }, under: { close: { line: 'u222.5', odds: '-107' } } },
                },
              ],
            },
          ],
        },
      ],
    };
    const [g] = parseScoreboard(json, 'nba');
    expect(g.home.abbr).toBe('NY');
    expect(g.odds).toMatchObject({ spread: -4.5, total: 222.5, ml: { home: -180, away: 151 }, spreadOdds: { home: -108, away: -112 }, totalOdds: { over: -113, under: -107 } });
  });
});
