import { useMemo } from 'react';

const STYLES: Record<string, { emoji?: string[]; colors?: string[] }> = {
  c_confetti: { colors: ['#c6ff3d', '#4da3ff', '#ff4d6d', '#ffc53d', '#b46bff', '#2ee59d'] },
  c_coins: { emoji: ['🪙', '💰', '🪙', '💵'] },
  c_fire: { emoji: ['🔥', '🔥', '💥', '☄️'] },
  c_goat: { emoji: ['🐐', '🐐', '👑', '🏆'] },
};

export default function Confetti({ kind = 'c_confetti', count = 70 }: { kind?: string; count?: number }) {
  const s = STYLES[kind] ?? STYLES.c_confetti;
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 1.8 + Math.random() * 1.8,
        color: s.colors?.[i % s.colors.length],
        emoji: s.emoji?.[i % s.emoji.length],
        rot: Math.random() * 360,
      })),
    [count, s],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) =>
        p.emoji ? (
          <span key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}>
            {p.emoji}
          </span>
        ) : (
          <i
            key={i}
            style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)` }}
          />
        ),
      )}
    </div>
  );
}
