import { Link } from 'react-router-dom';
import type { Game, Side } from '../lib/espn';
import { getLeague } from '../lib/leagues';
import type { Market } from '../lib/markets';
import { fmtLine, fmtOdds } from '../lib/odds';
import { useSlip } from './BetSlip';
import { TeamLogo, fmtTime } from './ui';

export function StatusPill({ g }: { g: Game }) {
  if (g.canceled) return <span className="pill loss">{g.detail || 'Postponed'}</span>;
  if (g.state === 'in') return <span className="pill live">{g.detail}</span>;
  if (g.state === 'post') return <span className="pill">{g.detail || 'Final'}</span>;
  return <span className="pill">{fmtTime(g.date)}</span>;
}

function TeamRow({ s, other, g }: { s: Side; other: Side; g: Game }) {
  const showScore = g.state !== 'pre' && s.score !== null;
  const lost = g.state === 'post' && showScore && other.score !== null && (s.score ?? 0) < (other.score ?? 0);
  return (
    <div className={`team-row ${lost ? 'lost' : ''}`}>
      <TeamLogo team={s} />
      <div className="name">
        {s.short || s.name}
        {s.record && <span className="rec">{s.record}</span>}
      </div>
      {showScore && <div className="score">{s.score}</div>}
    </div>
  );
}

function OddBtn({ g, market, pick, top, bottom }: { g: Game; market: Market; pick: string; top: string; bottom?: number }) {
  const slip = useSlip();
  const on = slip.has(g.id, market.type, pick);
  const disabled = bottom === undefined || g.state !== 'pre';
  return (
    <button
      className={`odd ${on ? 'on' : ''} ${disabled ? 'off' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        slip.toggle(g, market, pick);
      }}
    >
      {top && <span className="l">{top}</span>}
      <span className="o">{fmtOdds(bottom)}</span>
    </button>
  );
}

export function OddsBoard({ g }: { g: Game }) {
  const o = g.odds;
  const lg = getLeague(g.league);
  if (!o || g.state !== 'pre') return null;
  if (lg.draws) {
    return (
      <div className="col gap-6">
        <div className="odds-grid">
          <div className="hdr">{g.away.abbr}</div>
          <div className="hdr">Draw</div>
          <div className="hdr">{g.home.abbr}</div>
          <OddBtn g={g} market={{ type: 'ml' }} pick="away" top="" bottom={o.ml.away} />
          <OddBtn g={g} market={{ type: 'ml' }} pick="draw" top="" bottom={o.ml.draw} />
          <OddBtn g={g} market={{ type: 'ml' }} pick="home" top="" bottom={o.ml.home} />
        </div>
        {o.total !== undefined && (
          <div className="odds-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <OddBtn g={g} market={{ type: 'total', line: o.total }} pick="over" top={`O ${o.total}`} bottom={o.totalOdds.over} />
            <OddBtn g={g} market={{ type: 'total', line: o.total }} pick="under" top={`U ${o.total}`} bottom={o.totalOdds.under} />
          </div>
        )}
      </div>
    );
  }
  const sp = o.spread;
  return (
    <div className="odds-grid">
      <div className="hdr">Spread</div>
      <div className="hdr">Total</div>
      <div className="hdr">Money</div>
      <OddBtn g={g} market={{ type: 'spread', line: sp }} pick="away" top={sp !== undefined ? fmtLine(-sp) : ''} bottom={sp !== undefined ? o.spreadOdds.away : undefined} />
      <OddBtn g={g} market={{ type: 'total', line: o.total }} pick="over" top={o.total !== undefined ? `O ${o.total}` : ''} bottom={o.total !== undefined ? o.totalOdds.over : undefined} />
      <OddBtn g={g} market={{ type: 'ml' }} pick="away" top="" bottom={o.ml.away} />
      <OddBtn g={g} market={{ type: 'spread', line: sp }} pick="home" top={sp !== undefined ? fmtLine(sp) : ''} bottom={sp !== undefined ? o.spreadOdds.home : undefined} />
      <OddBtn g={g} market={{ type: 'total', line: o.total }} pick="under" top={o.total !== undefined ? `U ${o.total}` : ''} bottom={o.total !== undefined ? o.totalOdds.under : undefined} />
      <OddBtn g={g} market={{ type: 'ml' }} pick="home" top="" bottom={o.ml.home} />
    </div>
  );
}

export default function GameCard({ g, odds = true }: { g: Game; odds?: boolean }) {
  const lg = getLeague(g.league);
  const showOdds = odds && g.state === 'pre' && !!g.odds;
  return (
    <Link to={`/game/${g.league}/${g.id}?d=${encodeURIComponent(g.date)}`} className="card game pressable" style={{ display: 'block' }}>
      <div className="game-head">
        <StatusPill g={g} />
        <span className="tiny dim ellipsis">
          {g.note ? `${g.note} · ` : ''}
          {lg.short}
          {g.broadcast ? ` · ${g.broadcast}` : ''}
        </span>
      </div>
      {showOdds && !lg.draws ? (
        <div className="game-split">
          <div className="teams" style={{ gap: 20, paddingTop: 16 }}>
            <TeamRow s={g.away} other={g.home} g={g} />
            <TeamRow s={g.home} other={g.away} g={g} />
          </div>
          <OddsBoard g={g} />
        </div>
      ) : (
        <>
          <div className="teams">
            <TeamRow s={g.away} other={g.home} g={g} />
            <TeamRow s={g.home} other={g.away} g={g} />
          </div>
          {showOdds && (
            <div className="mt-8">
              <OddsBoard g={g} />
            </div>
          )}
          {g.state === 'pre' && !g.odds && <div className="tiny dim mt-8">No book line yet — challenge friends with your own line</div>}
        </>
      )}
    </Link>
  );
}

export function MiniGame({ g }: { g: Game }) {
  return (
    <Link to={`/game/${g.league}/${g.id}?d=${encodeURIComponent(g.date)}`} className="card tight pressable mini-game">
      <div className="row between" style={{ marginBottom: 6 }}>
        <StatusPill g={g} />
        <span className="tiny dim">{getLeague(g.league).short}</span>
      </div>
      {[g.away, g.home].map((s) => (
        <div key={s.id + s.abbr} className="row" style={{ gap: 8, height: 28 }}>
          <TeamLogo team={s} size={22} />
          <span className="grow ellipsis" style={{ fontWeight: 700 }}>
            {s.abbr}
          </span>
          {g.state !== 'pre' && <span className="num" style={{ fontSize: 20 }}>{s.score}</span>}
        </div>
      ))}
    </Link>
  );
}
