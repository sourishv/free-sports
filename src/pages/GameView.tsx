import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DuelCard from '../components/DuelCard';
import { OddsBoard, StatusPill } from '../components/GameCard';
import { Empty, Icons, Spinner, TeamLogo, fmtTime } from '../components/ui';
import { useEngine } from '../data/engine';
import { useMe } from '../data/hooks';
import type { Game } from '../lib/espn';
import { getLeague } from '../lib/leagues';
import { fmtLine, fmtOdds } from '../lib/odds';
import { useGame } from '../lib/useLive';

export function Scorebug({ g }: { g: Game }) {
  const show = g.state !== 'pre';
  return (
    <div className="scorebug">
      {[g.away, g.home].map((s, i) => (
        <div key={i} style={{ order: i === 0 ? 0 : 2 }}>
          <TeamLogo team={s} size={56} />
          <div style={{ fontWeight: 800 }} className="ellipsis">
            {s.short || s.name}
          </div>
          <div className="tiny muted">{s.record}</div>
          {show && <div className="big">{s.score}</div>}
        </div>
      ))}
      <div style={{ order: 1 }} className="col" >
        <StatusPill g={g} />
        {!show && <span className="vs" style={{ fontSize: 28 }}>VS</span>}
      </div>
    </div>
  );
}

function LineScore({ g }: { g: Game }) {
  const n = Math.max(g.home.linescores.length, g.away.linescores.length);
  if (!n) return null;
  const lg = getLeague(g.league);
  const head = (i: number) =>
    lg.sport === 'baseball' ? i + 1 : lg.sport === 'soccer' ? (i < 2 ? `${i + 1}H` : 'ET') : lg.sport === 'hockey' ? (i < 3 ? `P${i + 1}` : i === 3 ? 'OT' : 'SO') : i < (lg.key === 'ncaam' ? 2 : 4) ? `${lg.key === 'ncaam' ? 'H' : 'Q'}${i + 1}` : `OT${i - (lg.key === 'ncaam' ? 1 : 3) > 1 ? i - (lg.key === 'ncaam' ? 1 : 3) : ''}`;
  return (
    <div className="hscroll-table">
      <table className="linescore">
        <thead>
          <tr>
            <th />
            {Array.from({ length: n }, (_, i) => (
              <th key={i}>{head(i)}</th>
            ))}
            <th>T</th>
          </tr>
        </thead>
        <tbody>
          {[g.away, g.home].map((s) => (
            <tr key={s.abbr}>
              <td style={{ fontWeight: 700 }}>{s.abbr}</td>
              {Array.from({ length: n }, (_, i) => (
                <td key={i} className="num">
                  {s.linescores[i] ?? '-'}
                </td>
              ))}
              <td className="num" style={{ fontWeight: 800 }}>
                {s.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GameView() {
  const { league = 'nfl', id = '' } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const me = useMe();
  const { duels } = useEngine();
  const { detail, game: g, loading, error } = useGame(league, id, sp.get('d') ?? undefined);
  const lg = getLeague(league);

  if (loading && !g) return <Spinner />;
  if (!g)
    return (
      <div className="page">
        <Empty emoji="🤷" title="Game not found">
          {error}
        </Empty>
      </div>
    );

  const myDuels = duels.filter((d) => d.game?.eventId === g.id || d.slate?.games.some((s) => s.game.eventId === g.id));

  return (
    <div className="page">
      <div className="row">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back">
          <Icons.back />
        </button>
        <div className="grow">
          <div className="tiny muted upper">
            {lg.emoji} {lg.label}
            {g.note ? ` · ${g.note}` : ''}
          </div>
          <div style={{ fontWeight: 700 }} className="ellipsis">
            {g.name}
          </div>
        </div>
      </div>

      <div className="card">
        <Scorebug g={g} />
        <div className="mt-16">
          <LineScore g={g} />
        </div>
        <div className="tiny dim center mt-8">
          {fmtTime(g.date)}
          {g.venue ? ` · ${g.venue}` : ''}
          {g.broadcast ? ` · ${g.broadcast}` : ''}
        </div>
      </div>

      <Link to={`/duels/new?league=${league}&event=${g.id}&d=${encodeURIComponent(g.date)}`} className="btn block">
        <Icons.duel size={20} /> Challenge friends on this game
      </Link>

      {g.odds && (
        <section className="col">
          <div className="section-head">
            <h2>Book lines</h2>
            <span className="tiny dim">{g.odds.provider}</span>
          </div>
          {g.state === 'pre' ? (
            <div className="card">
              <OddsBoard g={g} />
              <div className="tiny dim mt-8">Bet coins vs the house at these odds. Lines lock at kickoff.</div>
            </div>
          ) : (
            <div className="card tight small muted">
              Closing line: {g.odds.details ?? ''}
              {g.odds.spread !== undefined ? ` · ${g.home.abbr} ${fmtLine(g.odds.spread)}` : ''}
              {g.odds.total !== undefined ? ` · O/U ${g.odds.total}` : ''}
              {g.odds.ml.home !== undefined ? ` · ML ${g.away.abbr} ${fmtOdds(g.odds.ml.away)} / ${g.home.abbr} ${fmtOdds(g.odds.ml.home)}` : ''}
              <div className="tiny dim mt-8">Live game — the house is closed, but you can still start an in-game duel with your own line.</div>
            </div>
          )}
        </section>
      )}

      {myDuels.length > 0 && (
        <section className="col">
          <h2>Your duels on this game</h2>
          <div className="list">
            {myDuels.map((d) => (
              <DuelCard key={d.id} d={d} me={me.id} />
            ))}
          </div>
        </section>
      )}

      {detail && detail.leaders.length > 0 && (
        <section className="col">
          <h2>{g.state === 'pre' ? 'Season leaders' : 'Game leaders'}</h2>
          <div className="card tight">
            {detail.leaders.map((l, i) => (
              <div key={i} className="lb-row">
                {l.headshot ? (
                  <img src={l.headshot} alt="" width={36} height={36} style={{ borderRadius: '50%', objectFit: 'cover', background: 'var(--card2)' }} loading="lazy" />
                ) : (
                  <span style={{ width: 36 }} />
                )}
                <div className="grow">
                  <div style={{ fontWeight: 700 }} className="ellipsis">
                    {l.name} <span className="tiny muted">{l.team}</span>
                  </div>
                  <div className="tiny muted">{l.label}</div>
                </div>
                <div className="small" style={{ fontWeight: 700, textAlign: 'right', maxWidth: 130 }}>
                  {l.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
