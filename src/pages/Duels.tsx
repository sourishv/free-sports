import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DuelCard from '../components/DuelCard';
import { Empty, Icons, Seg, useAction } from '../components/ui';
import { findDuelByCode, isLocked } from '../data/api';
import { useEngine } from '../data/engine';
import { useMe, useQuery } from '../data/hooks';
import type { DuelDoc } from '../data/types';

export default function Duels() {
  const me = useMe();
  const nav = useNavigate();
  const { duels } = useEngine();
  const [tab, setTab] = useState<'active' | 'open' | 'history'>('active');
  const [code, setCode] = useState('');
  const { busy, run } = useAction();
  const friendIds = (me.friends ?? []).slice(0, 30);
  const { docs: friendDuels } = useQuery<DuelDoc>(friendIds.length ? 'duels' : null, { where: [['hostUid', 'in', friendIds]] });

  const active = duels.filter((d) => d.status === 'open').sort((a, b) => a.locksAt - b.locksAt);
  const history = duels.filter((d) => d.status !== 'open').sort((a, b) => (b.result?.settledAt ?? 0) - (a.result?.settledAt ?? 0));
  const open = friendDuels.filter((d) => d.status === 'open' && !isLocked(d) && !d.participants[me.id]).sort((a, b) => a.locksAt - b.locksAt);
  const list = tab === 'active' ? active : tab === 'open' ? open : history;

  const record = history.reduce(
    (acc, d) => {
      const p = d.participants[me.id];
      const pay = d.payouts?.[me.id];
      if (!p || pay === undefined || d.status === 'void') return acc;
      if (pay > p.stake) acc.w++;
      else if (pay < p.stake) acc.l++;
      acc.net += pay - p.stake;
      return acc;
    },
    { w: 0, l: 0, net: 0 },
  );

  return (
    <div className="page">
      <div className="row between">
        <div>
          <h1>Duels</h1>
          <div className="small muted">
            Duel record <b className="num">{record.w}-{record.l}</b> ·{' '}
            <span className={record.net >= 0 ? 'win' : 'loss'}>
              {record.net >= 0 ? '+' : ''}
              {record.net.toLocaleString()} net
            </span>
          </div>
        </div>
        <Link to="/duels/new" className="btn sm">
          <Icons.plus size={18} /> New
        </Link>
      </div>

      <div className="row">
        <input
          className="input grow num"
          style={{ letterSpacing: '.15em', fontSize: 18 }}
          placeholder="Invite code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        />
        <button
          className="btn ghost"
          disabled={code.length < 6 || busy}
          onClick={() =>
            run(async () => {
              const d = await findDuelByCode(code);
              if (!d) throw new Error('No duel with that code');
              nav(`/duel/${d.id}`);
            })
          }
        >
          Join
        </button>
      </div>

      <Seg
        value={tab}
        onChange={setTab}
        options={[
          { v: 'active', label: `Active${active.length ? ` (${active.length})` : ''}` },
          { v: 'open', label: `Open${open.length ? ` (${open.length})` : ''}` },
          { v: 'history', label: 'History' },
        ]}
      />

      {list.length ? (
        <div className="list">
          {list.map((d) => (
            <DuelCard key={d.id} d={d} me={me.id} />
          ))}
        </div>
      ) : tab === 'active' ? (
        <Empty emoji="⚔️" title="No active duels">
          Start one on any game, a whole slate (pick'em), or anything else — awards, season win totals, who shows up late to brunch.
        </Empty>
      ) : tab === 'open' ? (
        <Empty emoji="📭" title="No open duels from friends">
          When a friend creates a duel, it shows up here for you to join. Invite people with your handle <b>@{me.handle}</b>.
        </Empty>
      ) : (
        <Empty emoji="📜" title="No finished duels yet" />
      )}
    </div>
  );
}
