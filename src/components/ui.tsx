import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Side } from '../lib/espn';

/* ---------- icons (inline, no icon font) ---------- */
const I = (d: ReactNode) =>
  function Icon(p: { size?: number }) {
    return (
      <svg viewBox="0 0 24 24" width={p.size ?? 24} height={p.size ?? 24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {d}
      </svg>
    );
  };
export const Icons = {
  home: I(<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />),
  scores: I(
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M12 4v16M3 12h18" />
    </>,
  ),
  duel: I(
    <>
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" />
      <path d="M9.5 6.5 14 2h3v3l-4.5 4.5M5 14l-2 2M8 19l-3-3" />
    </>,
  ),
  shop: I(
    <>
      <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>,
  ),
  me: I(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>,
  ),
  back: I(<path d="M15 18l-6-6 6-6" />),
  plus: I(<path d="M12 5v14M5 12h14" />),
  share: I(
    <>
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <path d="M16 6l-4-4-4 4M12 2v14" />
    </>,
  ),
  close: I(<path d="M18 6 6 18M6 6l12 12" />),
  send: I(<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />),
  trophy: I(
    <>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </>,
  ),
  copy: I(
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>,
  ),
  gear: I(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>,
  ),
};

/* ---------- coin ---------- */
export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="coin-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="1" stopColor="#f0a000" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#coin-g)" stroke="#a86a00" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#a86a00" strokeWidth="1" opacity=".6" />
      <path d="M12 7.5v9M9.6 10a2.4 2 0 0 1 2.4-1.6c1.6 0 2.4.8 2.4 1.6M14.4 14c0 .8-.8 1.6-2.4 1.6S9.6 14.8 9.6 14" stroke="#7a4a00" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Coins({ n, size = 16, sign = false, className = '' }: { n: number; size?: number; sign?: boolean; className?: string }) {
  const s = sign && n > 0 ? '+' : '';
  return (
    <span className={`coin ${className}`} style={{ fontSize: size }}>
      <CoinIcon size={Math.round(size * 1.05)} />
      {s}
      {Math.round(n).toLocaleString()}
    </span>
  );
}

/** Animated number for the wallet. */
export function useCountUp(target: number, ms = 700) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(a + (target - a) * e));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function Wallet({ coins }: { coins: number }) {
  const v = useCountUp(coins);
  const [bump, setBump] = useState(false);
  const prev = useRef(coins);
  useEffect(() => {
    if (coins !== prev.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 500);
      prev.current = coins;
      return () => clearTimeout(t);
    }
  }, [coins]);
  return (
    <span className={`wallet ${bump ? 'bump' : ''}`}>
      <CoinIcon size={20} />
      <span className="num">{v.toLocaleString()}</span>
    </span>
  );
}

export function Streak({ n, size = 15 }: { n: number; size?: number }) {
  if (!n || Math.abs(n) < 2) return null;
  return (
    <span className={`streak ${n < 0 ? 'cold' : ''}`} style={{ fontSize: size }} title={n > 0 ? `${n} win streak` : `${-n} game skid`}>
      {n > 0 ? '🔥' : '🧊'}
      {Math.abs(n)}
    </span>
  );
}

/* ---------- team logo ---------- */
export function TeamLogo({ team, size = 28 }: { team: Pick<Side, 'logo' | 'abbr' | 'color'>; size?: number }) {
  const [err, setErr] = useState(false);
  if (!team.logo || err)
    return (
      <span className="logo fallback" style={{ width: size, height: size, background: team.color ?? '#334' }}>
        {team.abbr?.slice(0, 3)}
      </span>
    );
  return <img className="logo" src={team.logo} alt={team.abbr} width={size} height={size} loading="lazy" onError={() => setErr(true)} style={{ width: size, height: size }} />;
}

/* ---------- sheets ---------- */
export function Sheet({ open, onClose, children, center = false }: { open: boolean; onClose: () => void; children: ReactNode; center?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={`overlay ${center ? 'center' : ''}`} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        {!center && <div className="grabber" />}
        {children}
      </div>
    </div>
  );
}

/* ---------- toasts ---------- */
type ToastT = { id: number; text: string; kind: 'ok' | 'err' | 'info' };
const ToastCtx = createContext<(text: string, kind?: ToastT['kind']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const push = useCallback((text: string, kind: ToastT['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Wraps an async action: disables while running, toasts errors. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
      setBusy(true);
      try {
        const r = await fn();
        if (ok) toast(ok, 'ok');
        return r;
      } catch (e) {
        toast((e as Error).message || 'Something went wrong', 'err');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { busy, run };
}

/* ---------- misc ---------- */
export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.v} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)} type="button">
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="e">{emoji}</div>
      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {children && <div className="small mt-8">{children}</div>}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" />;
}

export function fmtCountdown(ms: number) {
  if (ms <= 0) return 'Locked';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

export function fmtTime(iso: string | number) {
  const d = new Date(iso);
  const today = new Date();
  const tmr = new Date(Date.now() + 86400000);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today ${time}`;
  if (d.toDateString() === tmr.toDateString()) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} ${time}`;
}

export function timeAgo(t: number) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export async function shareLink(url: string, text: string, toast: (t: string, k?: 'ok' | 'err' | 'info') => void) {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'FreeSports Duel', text, url });
      return;
    }
  } catch {
    /* user canceled — fall through to copy */
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast('Invite link copied 📋', 'ok');
  } catch {
    toast(url, 'info');
  }
}
