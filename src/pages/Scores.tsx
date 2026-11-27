import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import GameCard from '../components/GameCard';
import { Empty } from '../components/ui';
import { ymd } from '../lib/espn';
import { LEAGUES, getLeague } from '../lib/leagues';
import { useScoreboard } from '../lib/useLive';

export default function Scores() {
  const [sp, setSp] = useSearchParams();
  const league = sp.get('league') || 'nfl';
  const date = sp.get('d') || '';
  const lg = getLeague(league);
  const { games, loading, error } = useScoreboard(league, date || undefined);

  const days = useMemo(() => {
    const out: { v: string; label: string }[] = [{ v: '', label: lg.sport === 'football' ? 'This week' : 'Today' }];
    for (let i = -2; i <= 7; i++) {
      if (i === 0 && lg.sport !== 'football') continue;
      const d = new Date(Date.now() + i * 86400000);
      out.push({
        v: ymd(d),
        label: i === 0 ? 'Today' : i === -1 ? 'Yesterday' : i === 1 ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' }),
      });
    }
    return out;
  }, [lg.sport]);

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k === 'league') n.delete('d');
    setSp(n, { replace: true });
  };

  const live = games.filter((g) => g.state === 'in');
  const pre = games.filter((g) => g.state === 'pre');
  const post = games.filter((g) => g.state === 'post');

  return (
    <div className="page">
      <div className="col" style={{ gap: 12 }}>
        <div className="chips">
          {LEAGUES.map((l) => (
            <button key={l.key} className={`chip ${l.key === league ? 'on' : ''}`} onClick={() => set('league', l.key)}>
              {l.emoji} {l.short}
            </button>
          ))}
        </div>
        <div className="chips">
          {days.map((d) => (
            <button key={d.v || 'default'} className={`chip ${d.v === date ? 'on' : ''}`} onClick={() => set('d', d.v)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="small muted" style={{ marginTop: -6 }}>
        Tap odds to build a bet slip vs the house, or open a game to challenge friends with any line, half, or player prop.
      </div>

      {loading && !games.length ? (
        <div className="list">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120 }} />
          ))}
        </div>
      ) : error && !games.length ? (
        <Empty emoji="📡" title="Couldn't reach the scores feed">
          {error}. It'll retry automatically.
        </Empty>
      ) : !games.length ? (
        <Empty emoji="🗓️" title={`No ${lg.short} games ${date ? 'that day' : 'right now'}`}>
          Try another day or league — some leagues are in their off-season.
        </Empty>
      ) : (
        <>
          {[
            ['Live', live],
            ['Upcoming', pre],
            ['Final', post],
          ].map(([label, list]) =>
            (list as typeof games).length ? (
              <section key={label as string} className="col">
                <h2>
                  {label as string} <span className="muted num" style={{ fontSize: 16 }}>{(list as typeof games).length}</span>
                </h2>
                <div className="list">
                  {(list as typeof games).map((g) => (
                    <GameCard key={g.id} g={g} />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </>
      )}
      <div className="tiny dim center">Scores & lines via ESPN's public feed · refreshes every 15s while games are live</div>
    </div>
  );
}
