// Free, keyless ESPN public endpoints (CORS-enabled, so the browser calls them directly).
import { getLeague, type League } from './leagues';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

export type GameState = 'pre' | 'in' | 'post';

export interface Side {
  id: string;
  abbr: string;
  name: string;
  short: string;
  logo?: string;
  color?: string;
  record?: string;
  score: number | null;
  linescores: number[];
  winner?: boolean;
}

export interface GameOdds {
  provider: string;
  details?: string;
  spread?: number; // HOME line, e.g. -4.5 means home favored by 4.5
  total?: number;
  ml: { home?: number; away?: number; draw?: number };
  spreadOdds: { home?: number; away?: number };
  totalOdds: { over?: number; under?: number };
}

export interface Game {
  id: string;
  league: string;
  date: string;
  name: string;
  shortName: string;
  state: GameState;
  completed: boolean;
  canceled: boolean;
  detail: string;
  period: number;
  clock?: string;
  home: Side;
  away: Side;
  odds?: GameOdds;
  venue?: string;
  broadcast?: string;
  note?: string;
}

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const s = String(v).trim().replace(/^[ou]/i, '');
  if (s.toUpperCase() === 'EVEN' || s.toUpperCase() === 'EV') return 100;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseSide(c: any): Side {
  const t = c.team ?? c.athlete ?? {};
  const logo =
    t.logo ?? t.logos?.find((l: any) => l.rel?.includes('scoreboard'))?.href ?? t.logos?.[0]?.href ?? t.flag?.href ?? t.headshot?.href;
  const rec = (c.records ?? c.record ?? []).find?.((r: any) => r.type === 'total' || r.name === 'overall') ?? (c.records ?? c.record ?? [])[0];
  const ls = (c.linescores ?? []).map((l: any) => num(l.value ?? l.displayValue) ?? 0);
  const name = t.displayName ?? t.fullName ?? t.name ?? 'TBD';
  return {
    id: String(t.id ?? c.id ?? ''),
    abbr: t.abbreviation ?? t.shortName ?? (name.split(' ').pop() || name).slice(0, 12),
    name,
    short: t.shortDisplayName ?? t.shortName ?? t.name ?? name,
    logo,
    color: t.color ? `#${t.color}` : undefined,
    record: rec?.summary ?? rec?.displayValue,
    score: c.score === undefined || c.score === null || c.score === '' ? null : num(typeof c.score === 'object' ? c.score.value ?? c.score.displayValue : c.score) ?? null,
    linescores: ls,
    winner: c.winner,
  };
}

function parseOdds(o: any): GameOdds | undefined {
  if (!o) return undefined;
  const ml = o.moneyline ?? {};
  const ps = o.pointSpread ?? {};
  const tot = o.total ?? {};
  const pick = (x: any) => x?.close ?? x?.current ?? x?.open;
  const odds: GameOdds = {
    provider: o.provider?.displayName ?? o.provider?.name ?? 'Consensus',
    details: o.details,
    spread: num(o.spread) !== undefined ? num(o.spread) : num(pick(ps.home)?.line),
    total: num(o.overUnder) ?? num(pick(tot.over)?.line),
    ml: {
      home: num(pick(ml.home)?.odds) ?? num(o.homeTeamOdds?.moneyLine),
      away: num(pick(ml.away)?.odds) ?? num(o.awayTeamOdds?.moneyLine),
      draw: num(pick(ml.draw)?.odds) ?? num(o.drawOdds?.moneyLine),
    },
    spreadOdds: {
      home: num(pick(ps.home)?.odds) ?? num(o.homeTeamOdds?.spreadOdds) ?? (o.spread !== undefined ? -110 : undefined),
      away: num(pick(ps.away)?.odds) ?? num(o.awayTeamOdds?.spreadOdds) ?? (o.spread !== undefined ? -110 : undefined),
    },
    totalOdds: {
      over: num(pick(tot.over)?.odds) ?? num(o.overOdds) ?? (o.overUnder !== undefined ? -110 : undefined),
      under: num(pick(tot.under)?.odds) ?? num(o.underOdds) ?? (o.overUnder !== undefined ? -110 : undefined),
    },
  };
  // ESPN's `spread` is sometimes from the favorite's perspective; trust the home line when present.
  const homeLine = num(pick(ps.home)?.line);
  if (homeLine !== undefined) odds.spread = homeLine;
  if (odds.ml.home === undefined && odds.spread === undefined && odds.total === undefined) return undefined;
  return odds;
}

function parseCompetition(e: any, c: any, league: string): Game | null {
  const comps = c.competitors ?? [];
  if (comps.length !== 2) return null;
  let home = comps.find((x: any) => x.homeAway === 'home');
  let away = comps.find((x: any) => x.homeAway === 'away');
  if (!home || !away) {
    // fighters: order 1 = red corner (listed first)
    [away, home] = [...comps].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  }
  const st = c.status ?? e.status ?? {};
  const type = st.type ?? {};
  const name: string = type.name ?? '';
  const h = parseSide(home);
  const a = parseSide(away);
  const isFight = !!c.type?.abbreviation && getLeague(league).individual;
  return {
    id: String(c.id ?? e.id),
    league,
    date: c.date ?? e.date,
    name: isFight ? `${a.name} vs ${h.name}` : e.name ?? `${a.name} at ${h.name}`,
    shortName: isFight ? `${a.abbr} vs ${h.abbr}` : e.shortName ?? `${a.abbr} @ ${h.abbr}`,
    state: (type.state as GameState) ?? 'pre',
    completed: !!type.completed,
    canceled: /POSTPONED|CANCELED|CANCELLED|SUSPENDED|FORFEIT|ABANDONED/.test(name),
    detail: type.shortDetail ?? type.detail ?? '',
    period: st.period ?? 0,
    clock: st.displayClock,
    home: h,
    away: a,
    odds: parseOdds((c.odds ?? [])[0]),
    venue: c.venue?.fullName,
    broadcast: c.broadcast ?? c.broadcasts?.[0]?.names?.[0],
    note: isFight ? c.type?.abbreviation : c.notes?.[0]?.headline,
  };
}

export function parseScoreboard(json: any, league: string): Game[] {
  const out: Game[] = [];
  for (const e of json?.events ?? []) {
    for (const c of e.competitions ?? []) {
      const g = parseCompetition(e, c, league);
      if (g) out.push(g);
    }
  }
  return out;
}

export interface Athlete {
  id: string;
  name: string;
  team: string; // team abbr
  headshot?: string;
  position?: string;
}

export interface GameDetail {
  game: Game;
  /** per-athlete stat map, keyed by athlete id */
  stats: Record<string, Record<string, number>>;
  athletes: Athlete[];
  leaders: { team: string; label: string; name: string; value: string; headshot?: string }[];
}

function parseBox(json: any) {
  const stats: Record<string, Record<string, number>> = {};
  const athletes: Athlete[] = [];
  for (const team of json?.boxscore?.players ?? []) {
    const abbr = team.team?.abbreviation ?? '';
    for (const grp of team.statistics ?? []) {
      const keys: string[] = grp.keys ?? [];
      const isPitching = keys.includes('earnedRuns');
      const isGoalie = keys.includes('saves');
      for (const a of grp.athletes ?? []) {
        const id = String(a.athlete?.id ?? '');
        if (!id) continue;
        if (!stats[id]) {
          stats[id] = {};
          athletes.push({ id, name: a.athlete?.displayName ?? '?', team: abbr, headshot: a.athlete?.headshot?.href, position: a.athlete?.position?.abbreviation });
        }
        const m = stats[id];
        keys.forEach((k, i) => {
          const raw = String(a.stats?.[i] ?? '');
          const parts = k.split(/[-/]/);
          const vals = raw.split(/[-/]/);
          parts.forEach((p, j) => {
            const v = parseFloat(vals[j] ?? '');
            if (!Number.isFinite(v)) return;
            const key = isPitching ? `pitching.${p}` : p;
            if (isGoalie && p !== 'saves') return; // goalie rows only feed the saves prop
            if (m[key] === undefined) m[key] = v; // first group wins (e.g. QB INTs thrown vs defensive INTs)
          });
        });
      }
    }
  }
  return { stats, athletes };
}

export function statValue(stats: Record<string, number> | undefined, key: string): number | null {
  if (!stats) return null;
  let total = 0;
  for (const k of key.split('+')) total += stats[k] ?? 0;
  return total;
}

function parseSummary(json: any, league: string): GameDetail | null {
  const comp = json?.header?.competitions?.[0];
  if (!comp) return null;
  const g = parseCompetition({ ...json.header, name: undefined, shortName: undefined }, comp, league);
  if (!g) return null;
  // header lacks odds; pickcenter has them
  g.odds = g.odds ?? parseOdds(json.pickcenter?.[0]);
  g.name = `${g.away.name} at ${g.home.name}`;
  g.shortName = `${g.away.abbr} @ ${g.home.abbr}`;
  const { stats, athletes } = parseBox(json);
  const leaders: GameDetail['leaders'] = [];
  for (const t of json.leaders ?? []) {
    for (const cat of (t.leaders ?? []).slice(0, 3)) {
      const l = cat.leaders?.[0];
      if (l) leaders.push({ team: t.team?.abbreviation, label: cat.displayName, name: l.athlete?.displayName, value: l.displayValue, headshot: l.athlete?.headshot?.href });
    }
  }
  return { game: g, stats, athletes, leaders };
}

/* ---------- fetching with a tiny shared cache ---------- */

const cache = new Map<string, { t: number; p: Promise<any> }>();
async function getJSON(url: string, maxAgeMs: number): Promise<any> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < maxAgeMs) return hit.p;
  const p = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`ESPN ${r.status}`);
    return r.json();
  });
  cache.set(url, { t: Date.now(), p });
  p.catch(() => cache.delete(url));
  return p;
}

export const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

export async function fetchScoreboard(leagueKey: string, date?: string, maxAge = 10_000): Promise<Game[]> {
  const lg: League = getLeague(leagueKey);
  const qs = new URLSearchParams();
  if (date) qs.set('dates', date);
  if (lg.key === 'ncaaf') qs.set('groups', '80'); // all FBS games, not just top 25
  if (lg.key === 'ncaam' || lg.key === 'ncaaw') {
    qs.set('groups', '50');
    qs.set('limit', '300');
  }
  const url = `${BASE}/${lg.path}/scoreboard${qs.toString() ? `?${qs}` : ''}`;
  const games = parseScoreboard(await getJSON(url, maxAge), lg.key);
  return games.sort((a, b) => stateRank(a) - stateRank(b) || a.date.localeCompare(b.date));
}

const stateRank = (g: Game) => (g.state === 'in' ? 0 : g.state === 'pre' ? 1 : 2);

export async function fetchGameDetail(leagueKey: string, eventId: string, dateHint?: string, maxAge = 10_000): Promise<GameDetail | null> {
  const lg = getLeague(leagueKey);
  if (lg.individual) {
    // fights live inside a card; find via the scoreboard for that date
    const d = dateHint ? new Date(dateHint) : new Date();
    for (const off of [0, -1, 1]) {
      const day = new Date(d.getTime() + off * 86400000);
      const games = await fetchScoreboard(lg.key, ymd(day), maxAge).catch(() => [] as Game[]);
      const g = games.find((x) => x.id === eventId);
      if (g) return { game: g, stats: {}, athletes: [], leaders: [] };
    }
    return null;
  }
  const json = await getJSON(`${BASE}/${lg.path}/summary?event=${eventId}`, maxAge);
  return parseSummary(json, lg.key);
}

export async function fetchRoster(leagueKey: string, teamId: string): Promise<Athlete[]> {
  const lg = getLeague(leagueKey);
  const json = await getJSON(`${BASE}/${lg.path}/teams/${teamId}/roster`, 6 * 3600_000);
  const out: Athlete[] = [];
  const push = (a: any) =>
    out.push({ id: String(a.id), name: a.displayName ?? a.fullName, team: '', headshot: a.headshot?.href, position: a.position?.abbreviation });
  for (const a of json?.athletes ?? []) {
    if (a.items) a.items.forEach(push);
    else push(a);
  }
  return out;
}

export interface TeamLite {
  id: string;
  name: string;
  abbr: string;
  logo?: string;
}
export async function fetchTeams(leagueKey: string): Promise<TeamLite[]> {
  const lg = getLeague(leagueKey);
  const json = await getJSON(`${BASE}/${lg.path}/teams?limit=400`, 24 * 3600_000);
  const teams = json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return teams
    .map((t: any) => ({ id: String(t.team.id), name: t.team.displayName, abbr: t.team.abbreviation, logo: t.team.logos?.[0]?.href }))
    .sort((a: TeamLite, b: TeamLite) => a.name.localeCompare(b.name));
}
