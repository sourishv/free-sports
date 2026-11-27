import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { GAME } from '../config';
import { betOdds, placeBet } from '../data/api';
import { useMe } from '../data/hooks';
import type { BetLeg } from '../data/types';
import { buildOptions, gameRef, marketTitle, type Market } from '../lib/markets';
import type { Game } from '../lib/espn';
import { fmtOdds, parlayDecimal, toDecimal } from '../lib/odds';
import { Coins, Icons, Seg, Sheet, useAction } from './ui';

interface SlipCtx {
  legs: BetLeg[];
  toggle: (g: Game, market: Market, pick: string) => void;
  has: (eventId: string, type: string, pick: string) => boolean;
  clear: () => void;
  open: () => void;
}
const Ctx = createContext<SlipCtx>({ legs: [], toggle: () => {}, has: () => false, clear: () => {}, open: () => {} });
export const useSlip = () => useContext(Ctx);

const KEY = 'freesports:slip';

export function SlipProvider({ children }: { children: ReactNode }) {
  const [legs, setLegs] = useState<BetLeg[]>(() => {
    try {
      const l: BetLeg[] = JSON.parse(sessionStorage.getItem(KEY) || '[]');
      return l.filter((x) => Date.parse(x.game.date) > Date.now());
    } catch {
      return [];
    }
  });
  const [isOpen, setOpen] = useState(false);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(legs));
    } catch {
      /* ignore */
    }
  }, [legs]);

  const toggle = useCallback((g: Game, market: Market, pick: string) => {
    const opt = buildOptions(market, g, g.odds).find((o) => o.id === pick);
    if (!opt || opt.odds === undefined) return;
    setLegs((cur) => {
      const same = cur.find((l) => l.game.eventId === g.id && l.market.type === market.type);
      const rest = cur.filter((l) => !(l.game.eventId === g.id && l.market.type === market.type));
      if (same && same.pick === pick) return rest;
      const leg: BetLeg = { game: gameRef(g), market, marketTitle: marketTitle(market, g), pick, label: opt.id === 'draw' ? `Draw (${g.shortName})` : opt.label, odds: opt.odds! };
      return [...rest, leg].slice(-12);
    });
  }, []);
  const has = useCallback((eventId: string, type: string, pick: string) => legs.some((l) => l.game.eventId === eventId && l.market.type === type && l.pick === pick), [legs]);
  const clear = useCallback(() => setLegs([]), []);
  const value = useMemo(() => ({ legs, toggle, has, clear, open: () => setOpen(true) }), [legs, toggle, has, clear]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {legs.length > 0 && !isOpen && (
        <button className="slipbar" onClick={() => setOpen(true)}>
          <span className="count">{legs.length}</span>
          <span className="grow" style={{ textAlign: 'left' }}>
            Bet slip
          </span>
          <span>{legs.length > 1 ? `Parlay ${fmtOdds(betOdds(legs))}` : fmtOdds(legs[0].odds)}</span>
        </button>
      )}
      <Sheet open={isOpen} onClose={() => setOpen(false)}>
        <SlipBody legs={legs} setLegs={setLegs} close={() => setOpen(false)} />
      </Sheet>
    </Ctx.Provider>
  );
}

function SlipBody({ legs, setLegs, close }: { legs: BetLeg[]; setLegs: (f: (l: BetLeg[]) => BetLeg[]) => void; close: () => void }) {
  const me = useMe();
  const nav = useNavigate();
  const { busy, run } = useAction();
  const sameGame = new Set(legs.map((l) => l.game.eventId)).size !== legs.length;
  const [mode, setMode] = useState<'single' | 'parlay'>(legs.length > 1 && !sameGame ? 'parlay' : 'single');
  const [stake, setStake] = useState(100);
  const started = legs.filter((l) => Date.parse(l.game.date) <= Date.now());
  const parlayOk = legs.length > 1 && !sameGame;
  const m = legs.length > 1 && mode === 'parlay' && parlayOk ? 'parlay' : 'single';
  const totalRisk = m === 'parlay' ? stake : stake * legs.length;
  const toWin =
    m === 'parlay'
      ? Math.floor(stake * (parlayDecimal(legs.map((l) => l.odds)) - 1))
      : legs.reduce((a, l) => a + Math.floor(stake * (toDecimal(l.odds) - 1)), 0);

  const place = () =>
    run(async () => {
      if (started.length) throw new Error('A game already started — remove it to continue');
      if (totalRisk > me.coins) throw new Error(`Not enough coins (need ${totalRisk.toLocaleString()})`);
      if (m === 'parlay') await placeBet(me.id, legs, stake);
      else for (const l of legs) await placeBet(me.id, [l], stake);
      setLegs(() => []);
      close();
      nav('/me?tab=bets');
    }, m === 'parlay' ? `Parlay placed — to win ${toWin.toLocaleString()} 🪙` : `Bet${legs.length > 1 ? 's' : ''} placed 🔒`);

  if (!legs.length)
    return (
      <div className="center muted" style={{ padding: 24 }}>
        Slip is empty. Tap any odds to add a pick.
      </div>
    );

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row between">
        <h2>Bet slip</h2>
        <button className="link" onClick={() => setLegs(() => [])}>
          Clear all
        </button>
      </div>
      {legs.length > 1 && (
        <Seg
          value={m}
          onChange={(v) => setMode(v)}
          options={[
            { v: 'single', label: `Straight bets (${legs.length})` },
            { v: 'parlay', label: parlayOk ? `Parlay ${fmtOdds(betOdds(legs))}` : 'Parlay (same game ✕)' },
          ]}
        />
      )}
      <div className="list">
        {legs.map((l) => {
          const late = Date.parse(l.game.date) <= Date.now();
          return (
            <div key={`${l.game.eventId}${l.market.type}`} className="card tight row" style={late ? { borderColor: 'var(--loss)' } : undefined}>
              <div className="grow">
                <div style={{ fontWeight: 800 }}>{l.label}</div>
                <div className="small muted ellipsis">
                  {l.marketTitle} · {l.game.shortName}
                </div>
                {late && <div className="tiny loss">Game started — lines locked</div>}
              </div>
              <div className="num accent" style={{ fontSize: 18 }}>
                {fmtOdds(l.odds)}
              </div>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setLegs((cur) => cur.filter((x) => x !== l))} aria-label="Remove">
                <Icons.close size={16} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="field">
        <label className="label">{m === 'single' && legs.length > 1 ? 'Stake per bet' : 'Stake'}</label>
        <input
          className="input num"
          style={{ fontSize: 22 }}
          inputMode="numeric"
          value={stake || ''}
          onChange={(e) => setStake(Math.max(0, Math.min(GAME.maxStake, parseInt(e.target.value.replace(/\D/g, '') || '0', 10))))}
        />
      </div>
      <div className="stake-chips">
        {[25, 100, 500].map((v) => (
          <button key={v} onClick={() => setStake(v)}>
            {v}
          </button>
        ))}
        <button onClick={() => setStake(Math.max(1, Math.floor(me.coins / (m === 'parlay' ? 1 : legs.length))))}>MAX</button>
      </div>
      <div className="row between card tight">
        <div>
          <div className="tiny muted upper">Risk</div>
          <Coins n={totalRisk} size={18} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="tiny muted upper">To win</div>
          <Coins n={toWin} size={22} className="win" />
        </div>
      </div>
      <button className="btn block" disabled={busy || !stake || totalRisk > me.coins} onClick={place}>
        {totalRisk > me.coins ? 'Not enough coins' : m === 'parlay' ? `Place ${legs.length}-leg parlay` : `Place bet${legs.length > 1 ? 's' : ''}`}
      </button>
      <div className="tiny dim center">Lines from {legs[0] ? 'ESPN / DraftKings' : ''} · play money only, no real-world value</div>
    </div>
  );
}
