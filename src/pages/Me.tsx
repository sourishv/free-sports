import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Avatar from '../avatar/Avatar';
import { ITEM_MAP } from '../avatar/items';
import { AchievementGrid, BetCard, StatsGrid } from '../components/ProfileBits';
import { Coins, Empty, Icons, Seg, Streak, shareLink, useAction, useToast } from '../components/ui';
import { addFriend, findByHandle, levelFor, updateProfile } from '../data/api';
import { useEngine } from '../data/engine';
import { useMe, useQuery, useUsers } from '../data/hooks';
import { isDemo, store } from '../data/index';
import type { UserDoc } from '../data/types';
import { LevelBar } from './Home';

type Tab = 'stats' | 'bets' | 'friends' | 'settings';

export default function Me() {
  const me = useMe();
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get('tab') as Tab) || 'stats';
  const setTab = (t: Tab) => setSp({ tab: t }, { replace: true });

  return (
    <div className="page">
      <div className="preview-stage">
        <Avatar a={me.avatar} size={120} />
        <h2 style={{ textTransform: 'none' }}>
          {me.name} <Streak n={me.stats.streak} size={18} />
        </h2>
        <div className="row gap-6">
          <span className="title-tag">{ITEM_MAP[me.avatar.title]?.name ?? 'Rookie'}</span>
          <span className="pill">LVL {levelFor(me.xp)}</span>
        </div>
        <div className="small muted">@{me.handle}</div>
        <div style={{ width: '80%' }}>
          <LevelBar xp={me.xp} />
        </div>
        <Link to="/shop" className="btn xs ghost">
          Customize avatar
        </Link>
      </div>

      <Seg
        value={tab}
        onChange={setTab}
        options={[
          { v: 'stats', label: 'Stats' },
          { v: 'bets', label: 'Bets' },
          { v: 'friends', label: 'Friends' },
          { v: 'settings', label: <Icons.gear size={16} /> },
        ]}
      />

      {tab === 'stats' && (
        <>
          <StatsGrid u={me} />
          <section className="col">
            <h3>Achievements · {me.achievements.length}</h3>
            <AchievementGrid u={me} />
          </section>
        </>
      )}
      {tab === 'bets' && <BetsTab />}
      {tab === 'friends' && <FriendsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

function BetsTab() {
  const { bets } = useEngine();
  const sorted = [...bets].sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open') || b.placedAt - a.placedAt);
  if (!sorted.length)
    return (
      <Empty emoji="🎟️" title="No bets yet">
        Head to <Link to="/scores" className="link">Games</Link> and tap any odds to build a slip. Straights or parlays vs the house.
      </Empty>
    );
  return (
    <div className="list">
      {sorted.map((b) => (
        <BetCard key={b.id} b={b} />
      ))}
    </div>
  );
}

function FriendsTab() {
  const me = useMe();
  const toast = useToast();
  const { busy, run } = useAction();
  const [handle, setHandle] = useState('');
  const [scope, setScope] = useState<'friends' | 'global'>('friends');
  const friends = useUsers(me.friends ?? []);
  const { docs: global } = useQuery<UserDoc>(scope === 'global' ? 'users' : null, { orderBy: ['coins', 'desc'], limit: 50 });
  const board = useMemo(() => (scope === 'friends' ? [...friends, me] : global).sort((a, b) => b.coins - a.coins), [scope, friends, global, me]);
  const url = `${location.origin}${location.pathname}`;

  return (
    <>
      <div className="card">
        <h3>Add a friend</h3>
        <div className="small muted mt-8">
          Your handle is <b className="accent">@{me.handle}</b>. Friends see each other's open duels.
        </div>
        <div className="row mt-16">
          <input className="input grow" placeholder="@handle" value={handle} onChange={(e) => setHandle(e.target.value)} autoCapitalize="none" />
          <button
            className="btn"
            disabled={!handle.trim() || busy}
            onClick={() =>
              run(async () => {
                const u = await findByHandle(handle);
                if (!u) throw new Error('No player with that handle');
                await addFriend(me, u);
                setHandle('');
                return u;
              }).then((u) => u && toast(`You and ${u.name} are now friends 🤝`, 'ok'))
            }
          >
            Add
          </button>
        </div>
        <button className="btn ghost block mt-8 sm" onClick={() => shareLink(url, `Come bet fake money against me on FreeSports. Add me: @${me.handle}`, toast)}>
          <Icons.share size={16} /> Invite people to the app
        </button>
      </div>

      <Seg
        value={scope}
        onChange={setScope}
        options={[
          { v: 'friends', label: `Friends (${friends.length})` },
          { v: 'global', label: 'Everyone' },
        ]}
      />
      <div className="card tight">
        {board.map((u, i) => (
          <Link key={u.id} to={u.id === me.id ? '/me' : `/u/${u.id}`} className={`lb-row ${u.id === me.id ? 'me' : ''}`}>
            <span className="lb-rank">{i === 0 ? '👑' : i + 1}</span>
            <Avatar a={u.avatar} size={40} still />
            <div className="grow">
              <div style={{ fontWeight: 700 }} className="ellipsis">
                {u.name} <Streak n={u.stats?.streak ?? 0} size={13} />
              </div>
              <div className="tiny muted">
                {u.stats?.wins ?? 0}-{u.stats?.losses ?? 0} · LVL {levelFor(u.xp ?? 0)} · {ITEM_MAP[u.avatar?.title]?.name ?? 'Rookie'}
              </div>
            </div>
            <Coins n={u.coins} size={16} className="gold" />
          </Link>
        ))}
        {!board.length && <div className="small muted" style={{ padding: 10 }}>Nobody here yet.</div>}
      </div>
    </>
  );
}

function SettingsTab() {
  const me = useMe();
  const { busy, run } = useAction();
  const [name, setName] = useState(me.name);
  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="card col">
        <label className="label">Display name</label>
        <div className="row">
          <input className="input grow" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
          <button className="btn" disabled={busy || name.trim() === me.name || !name.trim()} onClick={() => run(() => updateProfile(me.id, { name }), 'Saved')}>
            Save
          </button>
        </div>
      </div>

      {!isDemo && (
        <div className="card col">
          <h3>Account</h3>
          <div className="small muted">Link Google so you never lose your coins & drip, and can sign in on any device.</div>
          <button className="btn ghost block" disabled={busy} onClick={() => run(() => store.signInGoogle(), 'Google linked ✅')}>
            Link / sign in with Google
          </button>
        </div>
      )}

      <div className="card col">
        <h3>About</h3>
        <div className="small muted">
          FreeSports uses play money only. Coins have no cash value and can't be bought, sold, or withdrawn. Scores & lines come from ESPN's public feed and may be delayed.
          {isDemo && ' You are in Demo Mode: everything is saved on this device only.'}
        </div>
      </div>

      <button
        className="btn hot block"
        onClick={() => {
          if (confirm(isDemo ? 'Sign out and erase all demo data on this device?' : 'Sign out? Guests without a linked Google account lose their profile.')) store.signOut();
        }}
      >
        {isDemo ? 'Reset demo' : 'Sign out'}
      </button>
    </div>
  );
}
