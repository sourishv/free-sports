import { useEffect, useRef, useState } from 'react';
import { fetchGameDetail, fetchScoreboard, type Game, type GameDetail } from './espn';

const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

/** Polls while the tab is visible. Faster while something is live. */
function usePoll<T>(key: string | null, load: () => Promise<T>, isLive: (v: T) => boolean) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const liveRef = useRef(isLive);
  liveRef.current = isLive;

  useEffect(() => {
    if (!key) {
      setLoading(false);
      return;
    }
    let alive = true;
    let timer: number | undefined;
    setLoading(true);
    setData(null);
    const tick = async () => {
      clearTimeout(timer);
      let live = false;
      if (visible()) {
        try {
          const v = await loadRef.current();
          if (!alive) return;
          setData(v);
          setError(null);
          live = liveRef.current(v);
        } catch (e) {
          if (alive) setError((e as Error).message || 'Network error');
        } finally {
          if (alive) setLoading(false);
        }
      }
      if (alive) timer = window.setTimeout(tick, live ? 15_000 : 60_000);
    };
    tick();
    const onVis = () => visible() && tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [key]);

  return { data, error, loading };
}

export function useScoreboard(league: string | null, date?: string) {
  const r = usePoll<Game[]>(
    league ? `${league}:${date ?? ''}` : null,
    () => fetchScoreboard(league!, date),
    (gs) => gs.some((g) => g.state === 'in'),
  );
  return { games: r.data ?? [], error: r.error, loading: r.loading };
}

export function useScoreboards(leagues: string[]) {
  const r = usePoll<Game[]>(
    leagues.join(','),
    async () => {
      const all = await Promise.all(leagues.map((l) => fetchScoreboard(l).catch(() => [] as Game[])));
      return all.flat();
    },
    (gs) => gs.some((g) => g.state === 'in'),
  );
  return { games: r.data ?? [], error: r.error, loading: r.loading };
}

export function useGame(league: string | undefined, eventId: string | undefined, dateHint?: string) {
  const r = usePoll<GameDetail | null>(
    league && eventId ? `${league}:${eventId}` : null,
    () => fetchGameDetail(league!, eventId!, dateHint),
    (d) => d?.game.state === 'in',
  );
  return { detail: r.data, game: r.data?.game ?? null, error: r.error, loading: r.loading };
}

/** Fetch many games (for slates / bet slips) at once. */
export function useGames(refs: { league: string; eventId: string; date?: string }[]) {
  const key = refs.map((r) => `${r.league}:${r.eventId}`).join(',');
  const r = usePoll<Record<string, GameDetail | null>>(
    refs.length ? key : null,
    async () => {
      const out: Record<string, GameDetail | null> = {};
      await Promise.all(
        refs.map(async (x) => {
          out[x.eventId] = await fetchGameDetail(x.league, x.eventId, x.date).catch(() => null);
        }),
      );
      return out;
    },
    (m) => Object.values(m).some((d) => d?.game.state === 'in'),
  );
  return r.data ?? {};
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
