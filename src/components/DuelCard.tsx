import { Link } from 'react-router-dom';
import Avatar from '../avatar/Avatar';
import { isLocked } from '../data/api';
import type { DuelDoc } from '../data/types';
import { getLeague } from '../lib/leagues';
import { useNow } from '../lib/useLive';
import { Coins, TeamLogo, fmtCountdown } from './ui';

export const KIND_LABEL = { game: 'Game duel', slate: "Pick'em", custom: 'Custom' } as const;

export function pickLabel(d: DuelDoc, uid: string) {
  const p = d.participants[uid];
  if (!p) return null;
  if (d.kind === 'slate') return `${Object.keys(p.picks ?? {}).length}/${d.slate?.games.length ?? 0} picks`;
  return d.options?.find((o) => o.id === p.pick)?.label ?? '—';
}

export default function DuelCard({ d, me }: { d: DuelDoc; me: string }) {
  const now = useNow(30_000);
  const pot = Object.values(d.participants).reduce((a, p) => a + p.stake, 0);
  const locked = isLocked(d);
  const mine = d.participants[me];
  const payout = d.payouts?.[me];
  const lg = d.league ? getLeague(d.league) : null;
  return (
    <Link to={`/duel/${d.id}`} className="card pressable" style={{ display: 'block' }}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="row gap-6">
          <span className={`pill ${d.kind === 'game' ? 'accent' : d.kind === 'slate' ? 'gold' : ''}`}>
            {lg?.emoji ?? '🎯'} {KIND_LABEL[d.kind]}
          </span>
          {d.status === 'open' && !locked && <span className="pill">Locks {fmtCountdown(d.locksAt - now)}</span>}
          {d.status === 'open' && locked && <span className="pill live">In play</span>}
          {d.status === 'settled' && mine && payout !== undefined && (
            <span className={`pill ${payout > mine.stake ? 'win' : payout < mine.stake ? 'loss' : ''}`}>
              {payout > mine.stake ? `Won +${(payout - mine.stake).toLocaleString()}` : payout < mine.stake ? `Lost ${(payout - mine.stake).toLocaleString()}` : 'Push'}
            </span>
          )}
          {d.status === 'void' && <span className="pill">Refunded</span>}
        </span>
        <Coins n={pot} size={15} className="gold" />
      </div>
      <div className="row">
        {d.game && (
          <div className="row gap-4" style={{ flex: 'none' }}>
            <TeamLogo team={d.game.away} size={26} />
            <TeamLogo team={d.game.home} size={26} />
          </div>
        )}
        <div className="grow">
          <div style={{ fontWeight: 800 }} className="ellipsis">
            {d.title}
          </div>
          <div className="small muted ellipsis">
            {d.marketTitle ?? (d.kind === 'slate' ? `${d.slate?.games.length} games · ${d.slate?.ats ? 'vs spread' : 'straight up'}` : d.scope === 'season' ? 'Season-long' : 'Host settles')}
            {mine && ` · You: ${pickLabel(d, me)}`}
          </div>
        </div>
        <div className="stack">
          {d.participantIds.slice(0, 4).map((u) => (
            <Avatar key={u} a={d.participants[u]?.avatar} size={28} still />
          ))}
          {d.participantIds.length > 4 && (
            <span className="pill" style={{ height: 28, borderRadius: 14 }}>
              +{d.participantIds.length - 4}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
