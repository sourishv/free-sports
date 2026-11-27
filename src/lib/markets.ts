import type { Game, GameDetail } from './espn';
import { statValue } from './espn';
import { getLeague } from './leagues';
import { fmtLine } from './odds';

export type MarketType = 'ml' | 'spread' | 'total' | 'h1_ml' | 'h1_total' | 'team_total' | 'prop';

export interface PropInfo {
  athleteId: string;
  name: string;
  team: string;
  stat: string;
  statLabel: string;
  headshot?: string;
}

export interface Market {
  type: MarketType;
  line?: number; // spread → HOME line; totals → the total
  team?: 'home' | 'away';
  prop?: PropInfo;
}

export interface Option {
  id: string;
  label: string;
  sub?: string;
  odds?: number;
}

export interface GameRef {
  eventId: string;
  league: string;
  date: string;
  name: string;
  shortName: string;
  home: { id: string; abbr: string; name: string; logo?: string; color?: string };
  away: { id: string; abbr: string; name: string; logo?: string; color?: string };
}

export const gameRef = (g: Game): GameRef => ({
  eventId: g.id,
  league: g.league,
  date: g.date,
  name: g.name,
  shortName: g.shortName,
  home: { id: g.home.id, abbr: g.home.abbr, name: g.home.name, logo: g.home.logo, color: g.home.color },
  away: { id: g.away.id, abbr: g.away.abbr, name: g.away.name, logo: g.away.logo, color: g.away.color },
});

export const MARKET_LABELS: Record<MarketType, string> = {
  ml: 'Moneyline',
  spread: 'Spread',
  total: 'Total',
  h1_ml: '1st Half Winner',
  h1_total: '1st Half Total',
  team_total: 'Team Total',
  prop: 'Player Prop',
};

export function marketTitle(m: Market, g: Pick<GameRef, 'league' | 'home' | 'away'>): string {
  const lg = getLeague(g.league);
  switch (m.type) {
    case 'h1_ml':
      return `${lg.firstHalf.label} Winner`;
    case 'h1_total':
      return `${lg.firstHalf.label} Total`;
    case 'team_total':
      return `${(m.team === 'home' ? g.home : g.away).abbr} Team Total`;
    case 'prop':
      return `${m.prop?.name} · ${m.prop?.statLabel}`;
    case 'total':
      return lg.sport === 'soccer' || lg.sport === 'hockey' ? 'Total Goals' : lg.sport === 'baseball' ? 'Total Runs' : 'Total Points';
    case 'ml':
      return lg.individual ? 'Fight Winner' : lg.draws ? 'Match Result (3-way)' : 'Moneyline';
    default:
      return MARKET_LABELS[m.type];
  }
}

export function buildOptions(m: Market, g: Pick<GameRef, 'league' | 'home' | 'away'>, odds?: Game['odds']): Option[] {
  const lg = getLeague(g.league);
  const L = m.line ?? 0;
  switch (m.type) {
    case 'ml': {
      const o: Option[] = [
        { id: 'away', label: g.away.abbr, sub: g.away.name, odds: odds?.ml.away },
        { id: 'home', label: g.home.abbr, sub: g.home.name, odds: odds?.ml.home },
      ];
      if (lg.draws) o.splice(1, 0, { id: 'draw', label: 'Draw', sub: 'Tie after 90′', odds: odds?.ml.draw });
      return o;
    }
    case 'spread':
      return [
        { id: 'away', label: `${g.away.abbr} ${fmtLine(-L)}`, sub: g.away.name, odds: odds?.spread === L ? odds?.spreadOdds.away : undefined },
        { id: 'home', label: `${g.home.abbr} ${fmtLine(L)}`, sub: g.home.name, odds: odds?.spread === L ? odds?.spreadOdds.home : undefined },
      ];
    case 'total':
    case 'h1_total':
    case 'team_total':
    case 'prop': {
      const sameAsBook = m.type === 'total' && odds?.total === L;
      return [
        { id: 'over', label: `Over ${L}`, odds: sameAsBook ? odds?.totalOdds.over : undefined },
        { id: 'under', label: `Under ${L}`, odds: sameAsBook ? odds?.totalOdds.under : undefined },
      ];
    }
    case 'h1_ml':
      return [
        { id: 'away', label: g.away.abbr, sub: g.away.name },
        { id: 'tie', label: 'Tie', sub: `Tied after ${lg.firstHalf.label.toLowerCase()}` },
        { id: 'home', label: g.home.abbr, sub: g.home.name },
      ];
  }
}

export interface Grade {
  /** true once the result can no longer change */
  final: boolean;
  /** game was canceled / player didn't play → refund everyone */
  void: boolean;
  /** exact landing on a line */
  push: boolean;
  /** winning option ids (current leaders while live) */
  winners: string[];
  /** human readable explanation, e.g. "BOS 112 – 104 NY" or "Brunson: 31 pts" */
  summary: string;
}

const sum = (a: number[], n: number) => a.slice(0, n).reduce((x, y) => x + y, 0);

const ou = (val: number, line: number): Pick<Grade, 'winners' | 'push'> =>
  val > line ? { winners: ['over'], push: false } : val < line ? { winners: ['under'], push: false } : { winners: [], push: true };

/** Grade a market against the current state of a game. Works live (provisional) and final. */
export function gradeMarket(m: Market, game: Game, detail?: GameDetail | null): Grade | null {
  if (game.canceled) return { final: true, void: true, push: false, winners: [], summary: 'Game canceled / postponed' };
  if (game.state === 'pre') return null;
  const lg = getLeague(game.league);
  const hs = game.home.score ?? 0;
  const as = game.away.score ?? 0;
  const scoreLine = `${game.away.abbr} ${as} – ${hs} ${game.home.abbr}`;
  const done = game.completed || game.state === 'post';
  const L = m.line ?? 0;
  const base = { final: done, void: false, push: false };

  switch (m.type) {
    case 'ml': {
      if (lg.individual) {
        const w = game.home.winner ? ['home'] : game.away.winner ? ['away'] : [];
        if (done && !w.length) return { ...base, push: true, winners: [], summary: 'Draw / No contest' };
        return { ...base, winners: w, summary: done ? `${(w[0] === 'home' ? game.home : game.away).name} wins` : game.detail };
      }
      if (hs === as) {
        if (lg.draws) return { ...base, winners: ['draw'], summary: scoreLine };
        return { ...base, push: done, winners: [], summary: scoreLine };
      }
      return { ...base, winners: [hs > as ? 'home' : 'away'], summary: scoreLine };
    }
    case 'spread': {
      const d = hs + L - as;
      return { ...base, push: d === 0, winners: d > 0 ? ['home'] : d < 0 ? ['away'] : [], summary: scoreLine };
    }
    case 'total':
      return { ...base, ...ou(hs + as, L), summary: `${hs + as} total · ${scoreLine}` };
    case 'team_total': {
      const t = m.team === 'home' ? hs : as;
      return { ...base, ...ou(t, L), summary: `${(m.team === 'home' ? game.home : game.away).abbr}: ${t}` };
    }
    case 'h1_ml':
    case 'h1_total': {
      const n = lg.firstHalf.n;
      const h = sum(game.home.linescores, n);
      const a = sum(game.away.linescores, n);
      const halfDone = done || (game.state === 'in' && game.period > n);
      const g = { ...base, final: halfDone };
      const s = `${lg.firstHalf.label}: ${game.away.abbr} ${a} – ${h} ${game.home.abbr}`;
      if (m.type === 'h1_total') return { ...g, ...ou(h + a, L), summary: s };
      return { ...g, winners: [h > a ? 'home' : a > h ? 'away' : 'tie'], summary: s };
    }
    case 'prop': {
      if (!m.prop) return null;
      const stats = detail?.stats?.[m.prop.athleteId];
      if (!stats) {
        if (done && detail) return { ...base, void: true, winners: [], summary: `${m.prop.name} did not play` };
        return { ...base, final: false, winners: [], summary: `${m.prop.name}: waiting for stats` };
      }
      const v = statValue(stats, m.prop.stat) ?? 0;
      return { ...base, ...ou(v, L), summary: `${m.prop.name}: ${v} ${m.prop.statLabel.toLowerCase()}` };
    }
  }
}

export const needsDetail = (m: Market) => m.type === 'prop';

/** Which markets can be offered for a given game. */
export function availableMarkets(g: Game): MarketType[] {
  const lg = getLeague(g.league);
  if (lg.individual) return ['ml'];
  const out: MarketType[] = ['ml', 'spread', 'total', 'h1_ml', 'h1_total', 'team_total'];
  if (lg.sport !== 'soccer') out.push('prop');
  return out;
}

/** Sensible default line for a market. */
export function defaultLine(type: MarketType, g: Game): number | undefined {
  const lg = getLeague(g.league);
  const fallbackTotal: Record<string, number> = { football: 44.5, basketball: 220.5, hockey: 6.5, baseball: 8.5, soccer: 2.5, mma: 0 };
  const total = g.odds?.total ?? (lg.key.startsWith('ncaa') && lg.sport === 'basketball' ? 140.5 : fallbackTotal[lg.sport]);
  switch (type) {
    case 'spread':
      return g.odds?.spread ?? (lg.sport === 'hockey' || lg.sport === 'baseball' ? -1.5 : lg.sport === 'soccer' ? -0.5 : -3.5);
    case 'total':
      return total;
    case 'h1_total':
      return Math.floor(total * ({ hockey: 0.33, baseball: 0.55, soccer: 0.45 }[lg.sport as string] ?? 0.5)) + 0.5;
    case 'team_total':
      return Math.round(total / 2) - 0.5;
    case 'prop':
      return 0.5;
    default:
      return undefined;
  }
}
