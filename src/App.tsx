import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Avatar from './avatar/Avatar';
import { SlipProvider } from './components/BetSlip';
import Confetti from './components/Confetti';
import { Coins, Icons, Sheet, Spinner, Streak, ToastProvider, Wallet, useToast } from './components/ui';
import { ACH_MAP } from './data/achievements';
import { findDuelByCode } from './data/api';
import { useBots } from './data/bots';
import { EngineProvider, useEngine } from './data/engine';
import { MeContext, useAuth, useDoc, useMe } from './data/hooks';
import { isDemo } from './data/index';
import type { UserDoc } from './data/types';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';

const Scores = lazy(() => import('./pages/Scores'));
const GameView = lazy(() => import('./pages/GameView'));
const Duels = lazy(() => import('./pages/Duels'));
const CreateDuel = lazy(() => import('./pages/CreateDuel'));
const DuelView = lazy(() => import('./pages/DuelView'));
const Shop = lazy(() => import('./pages/Shop'));
const Me = lazy(() => import('./pages/Me'));
const Profile = lazy(() => import('./pages/Profile'));

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <Root />
      </ToastProvider>
    </HashRouter>
  );
}

function Root() {
  const { user, ready } = useAuth();
  const { doc: me, loading } = useDoc<UserDoc>('users', user?.uid);
  if (!ready || (user && loading))
    return (
      <div style={{ paddingTop: '40vh' }}>
        <Spinner />
      </div>
    );
  if (!user || !me) return <Onboarding authUser={user} />;
  return (
    <MeContext.Provider value={me}>
      <EngineProvider me={me}>
        <SlipProvider>
          <Shell />
        </SlipProvider>
      </EngineProvider>
    </MeContext.Provider>
  );
}

function Shell() {
  const me = useMe();
  useBots(me, isDemo);
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  const { duels } = useEngine();
  const activeDuels = duels.filter((d) => d.status === 'open').length;

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand grow">
          Free<b>Sports</b>
        </NavLink>
        <NavLink to="/shop" aria-label="Wallet">
          <Wallet coins={me.coins} />
        </NavLink>
        <NavLink to="/me" className="row" style={{ gap: 4 }} aria-label="Profile">
          <Streak n={me.stats.streak} />
          <Avatar a={me.avatar} size={36} still />
        </NavLink>
      </header>
      {isDemo && loc.pathname === '/' && (
        <div className="demo-banner">
          <b>Demo mode</b> — data stays on this device and the "friends" are bots. Add a free Firebase project (see README) to duel real friends.
        </div>
      )}
      <Suspense
        fallback={
          <div style={{ paddingTop: 80 }}>
            <Spinner />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scores" element={<Scores />} />
          <Route path="/game/:league/:id" element={<GameView />} />
          <Route path="/duels" element={<Duels />} />
          <Route path="/duels/new" element={<CreateDuel />} />
          <Route path="/duel/:id" element={<DuelView />} />
          <Route path="/join/:code" element={<JoinByCode />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/me" element={<Me />} />
          <Route path="/u/:uid" element={<Profile />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
      <nav className="nav">
        <div className="nav-inner">
          <NavLink to="/" end>
            <Icons.home />
            Home
          </NavLink>
          <NavLink to="/scores">
            <Icons.scores />
            Games
          </NavLink>
          <NavLink to="/duels">
            <Icons.duel />
            Duels
            {activeDuels > 0 && <span className="badge-dot">{activeDuels}</span>}
          </NavLink>
          <NavLink to="/shop">
            <Icons.shop />
            Shop
          </NavLink>
          <NavLink to="/me">
            <Icons.me />
            Me
          </NavLink>
        </div>
      </nav>
      <Celebrations />
    </div>
  );
}

function JoinByCode() {
  const { code } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  useEffect(() => {
    findDuelByCode(code ?? '')
      .then((d) => {
        if (d) nav(`/duel/${d.id}`, { replace: true });
        else {
          toast(`No duel with code ${code}`, 'err');
          nav('/duels', { replace: true });
        }
      })
      .catch(() => nav('/duels', { replace: true }));
  }, [code, nav, toast]);
  return <Spinner />;
}

function Celebrations() {
  const me = useMe();
  const nav = useNavigate();
  const { celebrations, dismiss } = useEngine();
  const c = celebrations[0];
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (c) setShown(c.id);
  }, [c]);
  if (!c) return null;
  const won = c.result === 'won';
  return (
    <>
      {won && shown === c.id && <Confetti kind={me.avatar.celebrate} />}
      <Sheet open center onClose={() => dismiss(c.id)}>
        <div className="celebrate">
          <div className="row" style={{ justifyContent: 'center' }}>
            <Avatar a={me.avatar} size={96} />
          </div>
          <h2 className="mt-16">{c.title}</h2>
          <div className="small muted mt-8">{c.subtitle}</div>
          <div className={`amount ${won ? 'win' : c.result === 'lost' ? 'loss' : ''}`}>
            {won ? '+' : ''}
            {c.amount.toLocaleString()}
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Coins n={me.coins} size={14} />
            <span className="tiny muted">balance</span>
          </div>
          {c.bonus > 0 && (
            <div className="pill gold mt-16" style={{ height: 28, fontSize: 12 }}>
              🔥 Heat check bonus +{c.bonus.toLocaleString()}
            </div>
          )}
          {won && c.streak >= 2 && <div className="mt-8 streak" style={{ fontSize: 20 }}>🔥 {c.streak} straight wins</div>}
          {c.achievements.length > 0 && (
            <div className="col mt-16" style={{ gap: 6 }}>
              {c.achievements.map((a) => (
                <div key={a} className="card tight row" style={{ borderColor: 'rgba(255,197,61,.4)' }}>
                  <span style={{ fontSize: 26 }}>{ACH_MAP[a]?.emoji}</span>
                  <div className="grow" style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800 }}>Achievement: {ACH_MAP[a]?.name}</div>
                    <div className="tiny muted">
                      {ACH_MAP[a]?.desc}
                      {ACH_MAP[a]?.coins ? ` · +${ACH_MAP[a].coins} coins` : ''}
                      {ACH_MAP[a]?.reward ? ' · new item unlocked!' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="row mt-24">
            {c.link && (
              <button
                className="btn ghost grow"
                onClick={() => {
                  dismiss(c.id);
                  nav(c.link!);
                }}
              >
                View
              </button>
            )}
            <button className={`btn grow ${won ? 'gold' : ''}`} onClick={() => dismiss(c.id)}>
              {won ? 'Collect' : c.result === 'lost' ? 'Run it back' : 'OK'}
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
