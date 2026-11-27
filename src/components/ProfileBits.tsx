import { ACHIEVEMENTS } from '../data/achievements';
import type { BetDoc, UserDoc } from '../data/types';
import { fmtLine, fmtOdds } from '../lib/odds';
import { Coins, fmtTime } from './ui';

export function StatsGrid({ u }: { u: UserDoc }) {
  const s = u.stats;
  const decided = s.wins + s.losses;
  const pct = decided ? Math.round((s.wins / decided) * 100) : 0;
  const cells: [string, React.ReactNode, string?][] = [
    ['Record', `${s.wins}-${s.losses}${s.pushes ? `-${s.pushes}` : ''}`],
    ['Win %', decided ? `${pct}%` : '—'],
    ['Profit', `${s.profit >= 0 ? '+' : ''}${s.profit.toLocaleString()}`, s.profit >= 0 ? 'win' : 'loss'],
    ['Streak', s.streak > 0 ? `🔥${s.streak}` : s.streak < 0 ? `🧊${-s.streak}` : '—'],
    ['Best run', s.bestStreak ? `🔥${s.bestStreak}` : '—'],
    ['Biggest hit', s.biggestWin ? `+${s.biggestWin.toLocaleString()}` : '—', 'gold'],
    ['Duels won', `${s.duelsWon}/${s.duelsPlayed}`],
    ['Parlays hit', String(s.parlaysHit)],
    ['Bailouts', String(u.bailouts ?? 0)],
  ];
  return (
    <div className="stat-grid">
      {cells.map(([k, v, cls]) => (
        <div key={k} className="stat">
          <div className={`v ${cls ?? ''}`}>{v}</div>
          <div className="k">{k}</div>
        </div>
      ))}
    </div>
  );
}

export function AchievementGrid({ u }: { u: UserDoc }) {
  return (
    <div className="ach-grid">
      {ACHIEVEMENTS.map((a) => {
        const has = u.achievements?.includes(a.id);
        return (
          <div key={a.id} className={`ach ${has ? '' : 'off'}`} title={a.desc}>
            <div className="e">{a.emoji}</div>
            <div>{a.name}</div>
            <div className="tiny muted" style={{ fontWeight: 500 }}>
              {a.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BetCard({ b }: { b: BetDoc }) {
  const res = b.status;
  return (
    <div className="card tight">
      <div className="row between" style={{ marginBottom: 6 }}>
        <span className={`pill ${res === 'won' ? 'win' : res === 'lost' ? 'loss' : res === 'open' ? 'accent' : ''}`}>
          {res === 'open' ? (b.kind === 'parlay' ? `${b.legs.length}-leg parlay` : 'Open') : res}
        </span>
        <span className="num accent">{fmtOdds(b.odds)}</span>
      </div>
      {b.legs.map((l, i) => (
        <div key={i} className="row" style={{ padding: '4px 0' }}>
          <span style={{ width: 16, textAlign: 'center' }}>{l.result === 'won' ? '✅' : l.result === 'lost' ? '❌' : l.result ? '↩️' : '⏳'}</span>
          <div className="grow">
            <div style={{ fontWeight: 700 }}>
              {l.label}
              {l.market.type === 'spread' && !l.label.match(/[+-]\d/) ? ` ${fmtLine(l.market.line)}` : ''}
            </div>
            <div className="tiny muted ellipsis">
              {l.marketTitle} · {l.game.shortName} · {fmtTime(l.game.date)}
            </div>
          </div>
          {b.legs.length > 1 && <span className="tiny muted">{fmtOdds(l.odds)}</span>}
        </div>
      ))}
      <div className="divider" />
      <div className="row between small">
        <span className="muted">
          Risk <Coins n={b.stake} size={13} />
        </span>
        {res === 'open' ? (
          <span>
            To win <Coins n={b.toWin} size={14} className="win" />
          </span>
        ) : res === 'won' ? (
          <span className="win" style={{ fontWeight: 700 }}>
            Won <Coins n={(b.payout ?? 0) - b.stake + (b.bonus ?? 0)} size={14} />
            {b.bonus ? ' 🔥' : ''}
          </span>
        ) : res === 'push' ? (
          <span className="muted">Refunded</span>
        ) : (
          <span className="loss">Lost</span>
        )}
      </div>
    </div>
  );
}
