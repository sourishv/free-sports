import { useState } from 'react';
import Avatar from '../avatar/Avatar';
import { randomStarterAvatar, type AvatarConfig } from '../avatar/items';
import { useAction } from '../components/ui';
import { GAME } from '../config';
import { createProfile } from '../data/api';
import { isDemo, store } from '../data/index';
import type { AuthUser } from '../data/store';

export default function Onboarding({ authUser }: { authUser: AuthUser | null }) {
  const [name, setName] = useState(authUser?.displayName?.split(' ')[0] ?? '');
  const [avatar, setAvatar] = useState<AvatarConfig>(randomStarterAvatar);
  const { busy, run } = useAction();

  const start = () =>
    run(async () => {
      if (!name.trim()) throw new Error('Pick a name your friends will recognize');
      let uid = authUser?.uid;
      if (!uid) {
        await store.signInGuest();
        uid = await new Promise<string>((res) => {
          const un = store.onAuth((u) => {
            if (u) {
              un();
              res(u.uid);
            }
          });
        });
      }
      await createProfile(uid, name, avatar);
    });

  return (
    <div className="app" style={{ paddingBottom: 24 }}>
      <div className="page" style={{ minHeight: '100dvh', justifyContent: 'center', gap: 22 }}>
        <div className="center">
          <div className="brand" style={{ fontSize: 44 }}>
            Free<b>Sports</b>
          </div>
          <div className="muted mt-8">Bet play money against your friends on real games. Live odds, duels, streaks & drip.</div>
        </div>

        <div className="preview-stage">
          <Avatar a={avatar} size={150} />
          <button className="btn ghost sm" onClick={() => setAvatar(randomStarterAvatar())}>
            🎲 Shuffle look
          </button>
          <div className="tiny muted">Unlock hats, chains, auras & more in the Shop</div>
        </div>

        <div className="field">
          <label className="label">Your name</label>
          <input
            className="input"
            placeholder="e.g. Big Sam"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && start()}
            autoFocus
          />
        </div>

        <button className="btn block" disabled={busy} onClick={start}>
          Let's go — claim {GAME.startingCoins.toLocaleString()} coins
        </button>

        {!isDemo && !authUser && (
          <button className="btn ghost block" disabled={busy} onClick={() => run(() => store.signInGoogle())}>
            Sign in with Google
          </button>
        )}

        <div className="tiny dim center">
          {isDemo
            ? 'Demo mode: your profile lives on this device, and bot friends play along.'
            : authUser
              ? 'Signed in — just pick a name.'
              : 'Playing as a guest works instantly. Link Google later in your profile to keep your account on every device.'}
          <br />
          Coins are play money with no cash value. They can't be bought or cashed out.
        </div>
      </div>
    </div>
  );
}
