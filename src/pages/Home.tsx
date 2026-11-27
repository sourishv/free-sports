import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../avatar/Avatar';
import { ITEM_MAP } from '../avatar/items';
import DuelCard from '../components/DuelCard';
import { MiniGame } from '../components/GameCard';
import { Coins, Icons, Sheet, Streak, useAction } from '../components/ui';
import { GAME } from '../config';
import { bailoutAvailable, claimDaily, dailyAvailable, findDuelByCode, isLocked, levelFor, nextDailyStreak, takeBailout, xpForLevel } from '../data/api';
import { useEngine } from '../data/engine';
import { useMe, useQuery, useUsers } from '../data/hooks';
import type { DuelDoc } from '../data/types';
import { HOME_LEAGUES } from '../lib/leagues';
import { useScoreboards } from '../lib/useLive';

export function LevelBar({ xp }: { xp: number }) {
  const lvl = levelFor(xp);
  const a = xpForLevel(lvl);
  const b = xpForLevel(lvl + 1);
  return (
    <div className="col" style={{ gap: 4 }}>
      <div className="row between tiny">
        <b>LVL {lvl}</b>
        <span className="muted">
          {(xp - a).toLocaleString()} / {(b - a).toLocaleString()} XP
        </span>
      </div>
      <div className="progress">
        <div style={{ width: `${((xp - a) / (b - a)) * 100}%` }} />
      </div>
    </div>
  );
}

export default function Home() {
  const me = useMe();
  const nav = useNavigate();
  const { duels, bets } = useEngine();
  const { busy, run } = useAction();
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState('');

  const active = duels.filter((d) => d.status === 'open').sort((a, b) => a.locksAt - b.locksAt);
  const openBets = bets.filter((b) => b.status === 'open');
  const friendIds = (me.friends ?? []).slice(0, 30);
  const { docs: friendDuels } = useQuery<DuelDoc>(friendIds.length ? 'duels' : null, { where: [['hostUid', 'in', friendIds]] });
  const joinable = friendDuels.filter((d) => d.status === 'open' && !isLocked(d) && !d.participants[me.id]).sort((a, b) => a.locksAt - b.locksAt);
  const friends = useUsers(friendIds);
  const board = useMemo(() => [...friends, me].sort((a, b) => b.coins - a.coins).slice(0, 5), [friends, me]);

  const { games, loading } = useScoreboards(HOME_LEAGUES);
  const live = games.filter((g) => g.state === 'in');
  const soon = games
    .filter((g) => g.state === 'pre' && Date.parse(g.date) - Date.now() < 36 * 3600_000 && Date.parse(g.date) > Date.now())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 12);

  const daily = dailyAvailable(me);
  const dayN = nextDailyStreak(me);
  const canBail = bailoutAvailable(me, active.length + openBets.length);
  const s = me.stats;

  return (
    <div className="page">
      <div className="hero">
        <div className="row" style={{ gap: 14 }}>
          <Avatar a={me.avatar} size={76} />
          <div className="grow">
            <div className="tiny muted upper">Welcome back</div>
            <h1 style={{ fontSize: 30 }} className="ellipsis">
              {me.name}
            </h1>
            <div className="row gap-6 mt-8 wrap">
              <span className="title-tag">{ITEM_MAP[me.avatar.title]?.name ?? 'Rookie'}</span>
              <span className="small muted num">
                {s.wins}-{s.losses}
                {s.pushes ? `-${s.pushes}` : ''}
              </span>
              <Streak n={s.streak} size={16} />
            </div>
          </div>
        </div>
        <div className="mt-16">
          <LevelBar xp={me.xp} />
        </div>
        <div className="row mt-16">
          <Link to="/duels/new" className="btn grow">
            <Icons.duel size={20} /> New duel
          </Link>
          <button className="btn ghost grow" onClick={() => setJoinOpen(true)}>
            Join code
          </button>
        </div>
      </div>

      {daily && (
        <div className="card glow">
          <div className="row between">
            <div>
              <h3>Daily bonus · Day {dayN}</h3>
              <div className="small muted">Come back every day. Day 7 pays big.</div>
            </div>
            <button
              className="btn gold sm"
              disabled={busy}
              onClick={() => run(() => claimDaily(me.id), `+${GAME.dailyRewards[dayN - 1]} coins · day ${dayN} streak 🔥`)}
            >
              +{GAME.dailyRewards[dayN - 1]}
            </button>
          </div>
          <div className="daily-track mt-16">
            {GAME.dailyRewards.map((r, i) => (
              <div key={i} className={i + 1 < dayN ? 'done' : i + 1 === dayN ? 'next' : ''}>
                <b>{r}</b>D{i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {canBail && (
        <div className="card" style={{ borderColor: 'rgba(77,163,255,.4)' }}>
          <div className="row">
            <span style={{ fontSize: 34 }}>🏦</span>
            <div className="grow">
              <h3>Running on fumes?</h3>
              <div className="small muted">Take a {GAME.bailoutAmount} coin bailout (once a day). Your friends will see the bailout count. 😬</div>
            </div>
          </div>
          <button className="btn block mt-16" disabled={busy} onClick={() => run(() => takeBailout(me.id), `+${GAME.bailoutAmount} coins. Spend wisely.`)}>
            Take bailout
          </button>
        </div>
      )}

      <section className="col">
        <div className="section-head">
          <h2>Your action</h2>
          <Link to="/duels">All duels</Link>
        </div>
        {active.length === 0 && openBets.length === 0 ? (
          <div className="empty">
            <div className="e">⚔️</div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>Nothing riding right now</div>
            <div className="small mt-8">Challenge your friends on a game, or tap any odds to bet against the house.</div>
            <div className="row mt-16" style={{ justifyContent: 'center' }}>
              <Link to="/duels/new" className="btn sm">
                Start a duel
              </Link>
              <Link to="/scores" className="btn sm ghost">
                Browse games
              </Link>
            </div>
          </div>
        ) : (
          <div className="list">
            {active.slice(0, 4).map((d) => (
              <DuelCard key={d.id} d={d} me={me.id} />
            ))}
            {openBets.length > 0 && (
              <Link to="/me?tab=bets" className="card tight pressable row between">
                <span>
                  <b>{openBets.length}</b> open bet{openBets.length > 1 ? 's' : ''} vs the house
                </span>
                <Coins n={openBets.reduce((a, b) => a + b.stake, 0)} size={15} className="gold" />
              </Link>
            )}
          </div>
        )}
      </section>

      {joinable.length > 0 && (
        <section className="col">
          <div className="section-head">
            <h2>Friends are calling you out</h2>
          </div>
          <div className="list">
            {joinable.slice(0, 4).map((d) => (
              <DuelCard key={d.id} d={d} me={me.id} />
            ))}
          </div>
        </section>
      )}

      <section className="col">
        <div className="section-head">
          <h2>{live.length ? 'Live now' : 'Coming up'}</h2>
          <Link to="/scores">All games</Link>
        </div>
        {loading ? (
          <div className="rail">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton mini-game" style={{ height: 96 }} />
            ))}
          </div>
        ) : (
          <div className="rail">
            {(live.length ? [...live, ...soon.slice(0, 6)] : soon).map((g) => (
              <MiniGame key={g.league + g.id} g={g} />
            ))}
            {!live.length && !soon.length && <div className="muted small">No games in the next day and a half. Check the Games tab for the full schedule.</div>}
          </div>
        )}
      </section>

      <section className="col">
        <div className="section-head">
          <h2>Leaderboard</h2>
          <Link to="/me?tab=friends">Friends</Link>
        </div>
        <div className="card tight">
          {board.map((u, i) => (
            <Link to={u.id === me.id ? '/me' : `/u/${u.id}`} key={u.id} className={`lb-row ${u.id === me.id ? 'me' : ''}`}>
              <span className="lb-rank">{i === 0 ? '👑' : i + 1}</span>
              <Avatar a={u.avatar} size={36} still />
              <div className="grow">
                <div style={{ fontWeight: 700 }} className="ellipsis">
                  {u.name} <Streak n={u.stats?.streak ?? 0} size={13} />
                </div>
                <div className="tiny muted">{ITEM_MAP[u.avatar?.title]?.name ?? 'Rookie'}</div>
              </div>
              <Coins n={u.coins} size={16} className="gold" />
            </Link>
          ))}
          {board.length <= 1 && <div className="small muted" style={{ padding: 8 }}>Add friends from your profile to see how you stack up.</div>}
        </div>
      </section>

      <Sheet open={joinOpen} onClose={() => setJoinOpen(false)}>
        <div className="col" style={{ gap: 14 }}>
          <h2>Join a duel</h2>
          <div className="small muted">Enter the 6-character code your friend sent you.</div>
          <input
            className="input code"
            style={{ fontSize: 28, height: 60, textAlign: 'center' }}
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="ABC123"
            autoFocus
          />
          <button
            className="btn block"
            disabled={code.length < 6 || busy}
            onClick={() =>
              run(async () => {
                const d = await findDuelByCode(code);
                if (!d) throw new Error('No duel with that code');
                setJoinOpen(false);
                nav(`/duel/${d.id}`);
              })
            }
          >
            Find duel
          </button>
        </div>
      </Sheet>
    </div>
  );
}
