import { useId, type ReactElement } from 'react';
import { ITEM_MAP, randomStarterAvatar, type AvatarConfig } from './items';

const col = (id: string, i = 0, fallback = '#888') => ITEM_MAP[id]?.c?.[i] ?? fallback;

export const DEFAULT_AVATAR: AvatarConfig = { ...randomStarterAvatar(), skin: 'skin3', hair: 'hair_fade', hairColor: '#1b1b1b', jersey: 'j_blue', number: '7' };

interface Props {
  a?: Partial<AvatarConfig> | null;
  size?: number;
  className?: string;
  /** disable animations (lists with many avatars) */
  still?: boolean;
}

export default function Avatar({ a, size = 56, className = '', still = false }: Props) {
  const cfg: AvatarConfig = { ...DEFAULT_AVATAR, ...(a ?? {}) };
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (s: string) => `${s}${uid}`;
  const url = (s: string) => `url(#${id(s)})`;

  const skin = col(cfg.skin, 0, '#d9a06b');
  const skinFill = cfg.skin === 'chrome' ? url('skin') : skin;
  const hairC = cfg.hairColor || '#1b1b1b';
  const [j1, j2] = [col(cfg.jersey, 0, '#1d4ed8'), col(cfg.jersey, 1, '#fff')];
  const jerseyFill = cfg.jersey === 'j_tiedye' || cfg.jersey === 'j_gold' || cfg.jersey === 'j_camo' ? url('jersey') : j1;

  const hairBehind: Record<string, ReactElement | null> = {
    hair_long: <path d="M31 56 C27 22 93 22 89 56 L92 86 L79 86 L79 62 L41 62 L41 86 L28 86 Z" fill={hairC} />,
    hair_afro: (
      <g fill={hairC}>
        <circle cx="60" cy="44" r="33" />
        <circle cx="34" cy="56" r="12" />
        <circle cx="86" cy="56" r="12" />
      </g>
    ),
    hair_mullet: <path d="M33 54 L29 88 L46 86 L42 60 Z M87 54 L91 88 L74 86 L78 60 Z" fill={hairC} />,
  };

  const hairFront: Record<string, ReactElement | null> = {
    hair_buzz: <path d="M34 48 C35 27 85 27 86 48 C76 39 44 39 34 48 Z" fill={hairC} opacity=".85" />,
    hair_fade: <path d="M33 47 C34 22 86 22 87 47 C80 34 40 34 33 47 Z" fill={hairC} />,
    hair_long: <path d="M33 50 C34 24 86 24 87 50 C78 38 46 35 33 50 Z" fill={hairC} />,
    hair_afro: null,
    hair_mohawk: <path d="M52 36 L53 14 L58 22 L60 10 L62 22 L67 14 L68 36 Z" fill={hairC} />,
    hair_spiky: <path d="M33 47 L35 29 L43 35 L47 20 L55 31 L61 16 L67 31 L75 20 L79 35 L86 29 L87 47 C76 38 44 38 33 47Z" fill={hairC} />,
    hair_bun: (
      <g fill={hairC}>
        <path d="M33 48 C34 24 86 24 87 48 C78 37 42 37 33 48 Z" />
        <circle cx="60" cy="23" r="8" />
      </g>
    ),
    hair_mullet: <path d="M33 48 C34 23 86 23 87 48 C79 35 41 35 33 48 Z" fill={hairC} />,
  };

  const eyes: Record<string, ReactElement> = {
    e_dot: (
      <g>
        <circle cx="49" cy="54" r="3.4" fill="#1b1b1b" />
        <circle cx="71" cy="54" r="3.4" fill="#1b1b1b" />
        <circle cx="50.2" cy="52.8" r="1" fill="#fff" />
        <circle cx="72.2" cy="52.8" r="1" fill="#fff" />
      </g>
    ),
    e_happy: (
      <g fill="none" stroke="#1b1b1b" strokeWidth="2.6" strokeLinecap="round">
        <path d="M44.5 56 Q49 50 53.5 56" />
        <path d="M66.5 56 Q71 50 75.5 56" />
      </g>
    ),
    e_wink: (
      <g>
        <circle cx="49" cy="54" r="3.4" fill="#1b1b1b" />
        <path d="M66.5 55 Q71 51 75.5 55" fill="none" stroke="#1b1b1b" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    ),
    e_focus: (
      <g>
        <circle cx="49" cy="55" r="3" fill="#1b1b1b" />
        <circle cx="71" cy="55" r="3" fill="#1b1b1b" />
        <path d="M43 47 L55 50 M77 47 L65 50" stroke="#1b1b1b" strokeWidth="2.8" strokeLinecap="round" />
      </g>
    ),
    e_sleepy: (
      <g stroke="#1b1b1b" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M44.5 54 Q49 57 53.5 54" />
        <path d="M66.5 54 Q71 57 75.5 54" />
        <path d="M44 52 L54 52 M66 52 L76 52" />
      </g>
    ),
    e_hearts: (
      <g fill="#ff2d6f">
        <path d="M49 59 L43.5 53.5 A3 3 0 0 1 49 50.5 A3 3 0 0 1 54.5 53.5 Z" />
        <path d="M71 59 L65.5 53.5 A3 3 0 0 1 71 50.5 A3 3 0 0 1 76.5 53.5 Z" />
      </g>
    ),
    e_stars: (
      <g fill="#ffd400" stroke="#b88600" strokeWidth=".6">
        <path d="M49 48 L50.8 52.4 L55.4 52.6 L51.8 55.4 L53 60 L49 57.4 L45 60 L46.2 55.4 L42.6 52.6 L47.2 52.4 Z" />
        <path d="M71 48 L72.8 52.4 L77.4 52.6 L73.8 55.4 L75 60 L71 57.4 L67 60 L68.2 55.4 L64.6 52.6 L69.2 52.4 Z" />
      </g>
    ),
    e_money: (
      <g fontFamily="Arial Black, Arial" fontWeight="900" fontSize="12" fill="#14b85a" textAnchor="middle">
        <text x="49" y="59">$</text>
        <text x="71" y="59">$</text>
      </g>
    ),
    e_laser: (
      <g>
        <g className={still ? '' : 'fx-pulse'}>
          <line x1="49" y1="54" x2="0" y2="80" stroke="#ff1744" strokeWidth="2.5" opacity=".8" />
          <line x1="71" y1="54" x2="120" y2="80" stroke="#ff1744" strokeWidth="2.5" opacity=".8" />
        </g>
        <circle cx="49" cy="54" r="4.2" fill="#ff1744" />
        <circle cx="71" cy="54" r="4.2" fill="#ff1744" />
        <circle cx="49" cy="54" r="1.8" fill="#fff" />
        <circle cx="71" cy="54" r="1.8" fill="#fff" />
      </g>
    ),
  };

  const teeth = <rect x="52" y="65" width="16" height="3.2" rx="1" fill="#fff" />;
  const mouths: Record<string, ReactElement> = {
    m_smile: <path d="M51 65 Q60 73 69 65" fill="none" stroke="#3a1f12" strokeWidth="2.6" strokeLinecap="round" />,
    m_grin: (
      <g>
        <path d="M49 64 Q60 78 71 64 Z" fill="#3a1f12" />
        {teeth}
      </g>
    ),
    m_smirk: <path d="M52 68 Q62 70 69 63" fill="none" stroke="#3a1f12" strokeWidth="2.6" strokeLinecap="round" />,
    m_o: <ellipse cx="60" cy="68" rx="4" ry="5" fill="#3a1f12" />,
    m_tongue: (
      <g>
        <path d="M49 64 Q60 78 71 64 Z" fill="#3a1f12" />
        <path d="M55 69 Q60 79 65 69 Z" fill="#ff6f91" />
      </g>
    ),
    m_guard: (
      <g>
        <path d="M49 64 Q60 77 71 64 Z" fill="#3a1f12" />
        <rect x="51" y="64.5" width="18" height="5" rx="2.5" fill="#00e5ff" />
      </g>
    ),
    m_whistle: (
      <g>
        <path d="M44 80 Q40 92 46 100" stroke="#111" strokeWidth="1.2" fill="none" />
        <rect x="56" y="64" width="12" height="7" rx="3" fill="#c9ced6" stroke="#6b7280" />
        <circle cx="66" cy="67.5" r="2.2" fill="#6b7280" />
      </g>
    ),
    m_grill: (
      <g>
        <path d="M49 64 Q60 78 71 64 Z" fill="#3a1f12" />
        <rect x="51.5" y="64.5" width="17" height="4" rx="1" fill="#ffd75e" stroke="#b8860b" strokeWidth=".6" />
        <path d="M55.5 64.5 V68.5 M60 64.5 V68.5 M64.5 64.5 V68.5" stroke="#b8860b" strokeWidth=".6" />
      </g>
    ),
  };

  const faces: Record<string, ReactElement | null> = {
    f_none: null,
    f_eyeblack: (
      <g fill="#111">
        <rect x="44" y="59" width="10" height="2.6" rx="1.2" />
        <rect x="66" y="59" width="10" height="2.6" rx="1.2" />
      </g>
    ),
    f_blush: (
      <g fill="#ff6f91" opacity=".45">
        <ellipse cx="42" cy="63" rx="5" ry="3" />
        <ellipse cx="78" cy="63" rx="5" ry="3" />
      </g>
    ),
    f_freckles: (
      <g fill="#8a4b16" opacity=".55">
        {[
          [41, 61],
          [45, 63],
          [43, 65],
          [79, 61],
          [75, 63],
          [77, 65],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r=".9" />
        ))}
      </g>
    ),
    f_stache: <path d="M50 63 Q55 59 60 62 Q65 59 70 63 Q65 65 60 63.5 Q55 65 50 63Z" fill={hairC} />,
    f_beard: <path d="M34 58 Q36 86 60 86 Q84 86 86 58 L82 58 Q80 72 70 72 Q60 64 50 72 Q40 72 38 58 Z" fill={hairC} />,
    f_paint: (
      <g opacity=".9">
        <path d="M38 58 L47 70" stroke={col('f_paint', 0)} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M82 58 L73 70" stroke={col('f_paint', 1)} strokeWidth="3.2" strokeLinecap="round" />
      </g>
    ),
    f_scar: <path d="M74 43 L70 51 M71 44.5 L75 46 M70.5 48 L73.5 49.4" stroke="#8b2c2c" strokeWidth="1.4" strokeLinecap="round" />,
  };

  const eyewear: Record<string, ReactElement | null> = {
    g_none: null,
    g_shades: (
      <g fill="#111">
        <rect x="40" y="48.5" width="17" height="11" rx="4" />
        <rect x="63" y="48.5" width="17" height="11" rx="4" />
        <rect x="56" y="51" width="8" height="2" />
        <rect x="42.5" y="50.5" width="5" height="2" rx="1" fill="#fff" opacity=".35" />
      </g>
    ),
    g_nerd: (
      <g fill="rgba(255,255,255,.15)" stroke="#222" strokeWidth="2.4">
        <circle cx="49" cy="54" r="7.5" />
        <circle cx="71" cy="54" r="7.5" />
        <path d="M56.5 54 H63.5" />
      </g>
    ),
    g_goggles: (
      <g>
        <rect x="31" y="49" width="58" height="6" fill="#222" />
        <rect x="38" y="45" width="44" height="16" rx="8" fill={url('goggle')} stroke="#222" strokeWidth="2" />
        <rect x="44" y="48" width="10" height="3" rx="1.5" fill="#fff" opacity=".5" />
      </g>
    ),
    g_visor: (
      <g>
        <path d="M33 47 Q60 41 87 47 L85 60 Q60 56 35 60 Z" fill={url('visor')} opacity=".85" stroke="#111" strokeWidth="1" />
      </g>
    ),
    g_vipers: (
      <g>
        <path d="M33 48 Q60 44 87 48 L84 59 Q72 62 62 56 L58 56 Q48 62 36 59 Z" fill={url('vipers')} stroke="#111" strokeWidth="1.3" />
      </g>
    ),
    g_monocle: (
      <g>
        <circle cx="71" cy="54" r="7" fill="rgba(255,255,255,.18)" stroke="#ffd75e" strokeWidth="2.2" />
        <path d="M77 59 Q82 74 76 88" fill="none" stroke="#ffd75e" strokeWidth="1" />
      </g>
    ),
  };

  const hc = (i: number, f = '#1d4ed8') => col(cfg.hat, i, f);
  const hats: Record<string, ReactElement | null> = {
    h_none: null,
    h_cap: (
      <g>
        <path d="M32 46 C31 19 89 19 88 46 Z" fill={hc(0)} />
        <path d="M60 44 L103 44 Q106 51 94 51 L60 48 Z" fill={hc(0)} stroke="rgba(0,0,0,.25)" />
        <circle cx="60" cy="22.5" r="2.5" fill={hc(0)} stroke="rgba(0,0,0,.3)" />
        <path d="M60 23 V45" stroke="rgba(0,0,0,.18)" />
      </g>
    ),
    h_back: (
      <g>
        <path d="M32 46 C31 19 89 19 88 46 Z" fill={hc(0)} />
        <path d="M60 44 L17 44 Q14 51 26 51 L60 48 Z" fill={hc(0)} stroke="rgba(0,0,0,.25)" />
        <path d="M50 30 Q60 26 70 30 L68 38 L52 38Z" fill="rgba(255,255,255,.25)" />
      </g>
    ),
    h_beanie: (
      <g>
        <path d="M31 48 C30 14 90 14 89 48 Z" fill={hc(0)} />
        <rect x="30" y="40" width="60" height="10" rx="4" fill={hc(0)} stroke="rgba(0,0,0,.2)" />
        <path d="M36 40 V50 M44 40 V50 M52 40 V50 M60 40 V50 M68 40 V50 M76 40 V50 M84 40 V50" stroke="rgba(0,0,0,.15)" />
        <circle cx="60" cy="15" r="7" fill={hc(1, '#fff')} />
      </g>
    ),
    h_band: (
      <g>
        <rect x="32" y="37" width="56" height="8" rx="3" fill={hc(0, '#fff')} />
        <rect x="32" y="40" width="56" height="2.4" fill={hc(1, '#e63946')} />
      </g>
    ),
    h_helmet: (
      <g>
        <path d="M27 60 C24 14 96 14 93 60 L93 68 L84 68 L84 50 L36 50 L36 68 L27 68Z" fill={hc(0, '#c0c7d6')} stroke="rgba(0,0,0,.25)" />
        <path d="M60 20 V50" stroke={hc(1)} strokeWidth="5" />
        <g stroke="#555" strokeWidth="2.2" fill="none">
          <path d="M36 62 Q60 82 84 62" />
          <path d="M38 70 Q60 88 82 70" />
          <path d="M60 70 V82" />
        </g>
      </g>
    ),
    h_cowboy: (
      <g fill={hc(0, '#8b5a2b')}>
        <ellipse cx="60" cy="38" rx="42" ry="8" />
        <path d="M40 38 C38 12 82 12 80 38 Z" />
        <rect x="40" y="31" width="40" height="4" fill="#3a2210" />
      </g>
    ),
    h_prop: (
      <g>
        <path d="M31 48 C30 16 90 16 89 48 Z" fill={hc(0, '#ffcc00')} />
        <path d="M31 48 C30 16 60 16 60 18 L60 48Z" fill={hc(1, '#e63946')} />
        <rect x="59" y="10" width="2" height="9" fill="#333" />
        <g className={still ? '' : 'fx-spin'} style={{ transformOrigin: '60px 10px' }}>
          <ellipse cx="50" cy="10" rx="10" ry="2.4" fill={hc(2, '#1d4ed8')} />
          <ellipse cx="70" cy="10" rx="10" ry="2.4" fill={hc(1, '#e63946')} />
        </g>
      </g>
    ),
    h_viking: (
      <g>
        <path d="M33 30 Q20 22 18 6 Q30 14 40 24Z" fill={hc(1, '#f4ecd8')} stroke="#b9ad8f" />
        <path d="M87 30 Q100 22 102 6 Q90 14 80 24Z" fill={hc(1, '#f4ecd8')} stroke="#b9ad8f" />
        <path d="M31 46 C30 16 90 16 89 46 Z" fill={hc(0, '#9aa3ad')} />
        <rect x="30" y="40" width="60" height="7" rx="2" fill="#7d858f" />
        {[38, 50, 62, 74, 84].map((x) => (
          <circle key={x} cx={x} cy="43.5" r="1.4" fill="#d6dbe1" />
        ))}
      </g>
    ),
    h_halo: (
      <g className={still ? '' : 'fx-float'}>
        <ellipse cx="60" cy="18" rx="20" ry="5" fill="none" stroke={hc(0, '#fff7a8')} strokeWidth="4" filter={`url(#${id('glow')})`} />
      </g>
    ),
    h_crown: (
      <g>
        <path d="M36 34 L38 14 L48 25 L60 8 L72 25 L82 14 L84 34 Z" fill={url('gold')} stroke="#a07000" strokeWidth="1" />
        <rect x="36" y="31" width="48" height="6" rx="2" fill={url('gold')} stroke="#a07000" strokeWidth="1" />
        <circle cx="60" cy="22" r="3" fill={hc(1, '#e63946')} />
        <circle cx="46" cy="30" r="2" fill="#2979ff" />
        <circle cx="74" cy="30" r="2" fill="#00e676" />
      </g>
    ),
  };

  const fx = cfg.effect;
  const frame = cfg.frame;
  const frameColors = [col(frame, 0, '#fff'), col(frame, 1, '#999')];

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`avatar ${className}`}
      role="img"
      aria-label="avatar"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={id('bg')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={col(cfg.bg, 0, '#2b3350')} />
          <stop offset="1" stopColor={col(cfg.bg, 1, '#1a2036')} />
        </linearGradient>
        <linearGradient id={id('jersey')} x1="0" y1="0" x2="1" y2="1">
          {cfg.jersey === 'j_tiedye' ? (
            <>
              <stop offset="0" stopColor="#ff4ecd" />
              <stop offset=".35" stopColor="#ffe74e" />
              <stop offset=".65" stopColor="#4ef2ff" />
              <stop offset="1" stopColor="#8b5cf6" />
            </>
          ) : cfg.jersey === 'j_camo' ? (
            <>
              <stop offset="0" stopColor="#5c6b3c" />
              <stop offset=".3" stopColor="#3e4a26" />
              <stop offset=".55" stopColor="#7a7a52" />
              <stop offset=".8" stopColor="#4a5530" />
              <stop offset="1" stopColor="#6b6b45" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#fff1a8" />
              <stop offset=".5" stopColor="#ffd75e" />
              <stop offset="1" stopColor="#c78a00" />
            </>
          )}
        </linearGradient>
        <linearGradient id={id('gold')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1a8" />
          <stop offset=".5" stopColor="#ffd75e" />
          <stop offset="1" stopColor="#c78a00" />
        </linearGradient>
        <radialGradient id={id('skin')} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff6c8" />
          <stop offset=".5" stopColor="#ffd75e" />
          <stop offset="1" stopColor="#b07800" />
        </radialGradient>
        <linearGradient id={id('goggle')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={col('g_goggles', 0)} />
          <stop offset="1" stopColor={col('g_goggles', 1)} />
        </linearGradient>
        <linearGradient id={id('visor')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={col('g_visor', 0)} />
          <stop offset="1" stopColor={col('g_visor', 1)} />
        </linearGradient>
        <linearGradient id={id('vipers')} x1="0" y1="0" x2="1" y2="0">
          {(ITEM_MAP.g_vipers.c ?? []).map((c, i, a) => (
            <stop key={c} offset={i / (a.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
        <linearGradient id={id('frame')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={frameColors[0]} />
          <stop offset="1" stopColor={frameColors[1]} />
        </linearGradient>
        <radialGradient id={id('aura')} cx=".5" cy=".5" r=".5">
          <stop offset=".6" stopColor={fx === 'fx_fire' ? '#ff9100' : fx === 'fx_goat' ? '#ffd75e' : col(fx, 0, '#7dfcff')} stopOpacity=".9" />
          <stop offset="1" stopColor={fx === 'fx_fire' ? '#ff1744' : '#000'} stopOpacity="0" />
        </radialGradient>
        <filter id={id('glow')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={id('clip')}>
          <circle cx="60" cy="60" r="58" />
        </clipPath>
      </defs>

      {/* effects behind */}
      {(fx === 'fx_glow' || fx === 'fx_fire' || fx === 'fx_goat') && (
        <circle cx="60" cy="60" r="70" fill={url('aura')} className={still ? '' : fx === 'fx_fire' ? 'fx-flicker' : 'fx-pulse'} />
      )}
      {fx === 'fx_fire' && (
        <g className={still ? '' : 'fx-flicker'} fill="#ff6d00" opacity=".9">
          <path d="M14 70 Q2 40 22 18 Q20 40 32 44 Q24 22 46 2 Q44 26 58 30 Q60 10 76 2 Q72 24 88 40 Q98 24 98 14 Q118 40 106 70 Z" />
        </g>
      )}

      <g clipPath={url('clip')}>
        <rect width="120" height="120" fill={url('bg')} />
        {cfg.bg === 'bg_galaxy' &&
          [
            [14, 20],
            [96, 16],
            [22, 84],
            [104, 70],
            [80, 34],
            [30, 44],
            [100, 100],
          ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 1 : 1.6} fill="#fff" className={still ? '' : 'fx-twinkle'} style={{ animationDelay: `${i * 0.3}s` }} />)}
        {cfg.bg === 'bg_money' && (
          <g fill="#ffffff" opacity=".14" fontSize="16" fontWeight="900" fontFamily="Arial Black, Arial">
            <text x="6" y="22">$</text>
            <text x="98" y="30">$</text>
            <text x="14" y="70">$</text>
            <text x="100" y="80">$</text>
            <text x="84" y="14">$</text>
          </g>
        )}
        {cfg.bg === 'bg_court' && <path d="M0 96 H120 M60 96 V120" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />}
        {cfg.bg === 'bg_turf' && <path d="M0 24 H120 M0 48 H120 M0 72 H120 M0 96 H120" stroke="#fff" strokeOpacity=".22" strokeWidth="1.5" />}
        {cfg.bg === 'bg_ice' && <circle cx="60" cy="60" r="30" fill="none" stroke="#e63946" strokeOpacity=".25" strokeWidth="2" />}

        {hairBehind[cfg.hair] ?? null}
        {/* body */}
        <rect x="52" y="74" width="16" height="16" fill={skinFill} />
        <path d="M12 124 C14 98 33 87 60 87 C87 87 106 98 108 124 Z" fill={jerseyFill} />
        <path d="M49 87.5 L60 100 L71 87.5" fill="none" stroke={j2} strokeWidth="3" />
        <path d="M24 102 Q24 112 22 124 M96 102 Q96 112 98 124" stroke={j2} strokeOpacity=".5" strokeWidth="2.5" fill="none" />
        <text x="60" y="117" textAnchor="middle" fontSize="15" fontWeight="900" fontFamily="'Barlow Condensed', Arial Narrow, Arial" fill={j2}>
          {cfg.number?.slice(0, 2)}
        </text>
        {/* head */}
        <circle cx="33" cy="57" r="6" fill={skinFill} />
        <circle cx="87" cy="57" r="6" fill={skinFill} />
        <circle cx="60" cy="55" r="27" fill={skinFill} />
        {cfg.face === 'f_beard' && faces.f_beard}
        {hairFront[cfg.hair] ?? null}
        {cfg.face !== 'f_beard' && faces[cfg.face]}
        {eyes[cfg.eyes] ?? eyes.e_dot}
        {mouths[cfg.mouth] ?? mouths.m_smile}
        {eyewear[cfg.eyewear]}
        {hats[cfg.hat]}
      </g>

      {/* frames */}
      {frame !== 'fr_none' && (
        <circle
          cx="60"
          cy="60"
          r="57.5"
          fill="none"
          stroke={url('frame')}
          strokeWidth={frame === 'fr_diamond' ? 6 : 5}
          className={still ? '' : frame === 'fr_neon' ? 'fx-hue' : frame === 'fr_fire' ? 'fx-flicker' : ''}
          strokeDasharray={frame === 'fr_fire' ? '10 4' : undefined}
        />
      )}
      {frame === 'fr_diamond' &&
        [0, 60, 120, 180, 240, 300].map((deg) => (
          <path
            key={deg}
            d="M60 -1 L64 3 L60 7 L56 3 Z"
            fill="#fff"
            transform={`rotate(${deg} 60 60)`}
            className={still ? '' : 'fx-twinkle'}
            style={{ animationDelay: `${deg / 200}s` }}
          />
        ))}

      {/* effects in front */}
      {fx === 'fx_sparkle' &&
        [
          [12, 18],
          [104, 22],
          [108, 92],
          [10, 98],
          [60, -4],
        ].map(([x, y], i) => (
          <path
            key={i}
            d={`M${x} ${y - 6} L${x + 1.6} ${y - 1.6} L${x + 6} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 6} L${x - 1.6} ${y + 1.6} L${x - 6} ${y} L${x - 1.6} ${y - 1.6} Z`}
            fill="#fff6a8"
            className={still ? '' : 'fx-twinkle'}
            style={{ animationDelay: `${i * 0.35}s` }}
          />
        ))}
      {fx === 'fx_orbit' && (
        <g className={still ? '' : 'fx-spin-slow'} style={{ transformOrigin: '60px 60px' }}>
          <circle cx="60" cy="-2" r="7" fill="#f97316" stroke="#7c2d12" strokeWidth="1.2" />
          <path d="M53 -2 H67 M60 -9 V5" stroke="#7c2d12" strokeWidth="1" />
        </g>
      )}
      {fx === 'fx_bolt' && (
        <g className={still ? '' : 'fx-flash'} fill="#fff176" stroke="#40c4ff" strokeWidth="1.2">
          <path d="M8 10 L22 10 L14 28 L24 28 L6 54 L12 34 L2 34 Z" />
          <path d="M112 66 L100 66 L106 82 L98 82 L114 108 L110 88 L118 88 Z" />
        </g>
      )}
      {fx === 'fx_goat' && (
        <g className={still ? '' : 'fx-spin-slow'} style={{ transformOrigin: '60px 60px' }}>
          <text x="60" y="4" fontSize="16" textAnchor="middle">
            🐐
          </text>
        </g>
      )}
    </svg>
  );
}
