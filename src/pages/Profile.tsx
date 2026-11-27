import { Link, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../avatar/Avatar';
import { ITEM_MAP } from '../avatar/items';
import { AchievementGrid, StatsGrid } from '../components/ProfileBits';
import { Coins, Empty, Icons, Spinner, Streak, useAction } from '../components/ui';
import { addFriend, levelFor } from '../data/api';
import { useDoc, useMe } from '../data/hooks';
import type { UserDoc } from '../data/types';
import { LevelBar } from './Home';

export default function Profile() {
  const { uid = '' } = useParams();
  const me = useMe();
  const nav = useNavigate();
  const { busy, run } = useAction();
  const { doc: u, loading } = useDoc<UserDoc>('users', uid);
  if (loading) return <Spinner />;
  if (!u)
    return (
      <div className="page">
        <Empty emoji="👻" title="Player not found" />
      </div>
    );
  const isFriend = me.friends?.includes(u.id);
  return (
    <div className="page">
      <div className="row">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back">
          <Icons.back />
        </button>
        <span className="grow" />
      </div>
      <div className="preview-stage">
        <Avatar a={u.avatar} size={130} />
        <h2 style={{ textTransform: 'none' }}>
          {u.name} <Streak n={u.stats.streak} size={18} />
        </h2>
        <div className="row gap-6">
          <span className="title-tag">{ITEM_MAP[u.avatar.title]?.name ?? 'Rookie'}</span>
          <span className="pill">LVL {levelFor(u.xp)}</span>
          {u.isBot && <span className="pill">🤖 Bot</span>}
        </div>
        <div className="small muted">@{u.handle}</div>
        <Coins n={u.coins} size={22} className="gold" />
        <div style={{ width: '80%' }}>
          <LevelBar xp={u.xp} />
        </div>
      </div>
      <div className="row">
        <Link to="/duels/new" className="btn grow">
          <Icons.duel size={20} /> Challenge
        </Link>
        {!isFriend && u.id !== me.id && (
          <button className="btn ghost grow" disabled={busy} onClick={() => run(() => addFriend(me, u), `Added ${u.name}`)}>
            Add friend
          </button>
        )}
      </div>
      <StatsGrid u={u} />
      <section className="col">
        <h3>Achievements · {u.achievements.length}</h3>
        <AchievementGrid u={u} />
      </section>
    </div>
  );
}
