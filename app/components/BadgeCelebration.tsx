'use client';

import { useEffect, useState } from 'react';
import type { BadgeStatus } from '@/lib/badges';

export default function BadgeCelebration({
  badge,
  onClose,
}: {
  badge: BadgeStatus;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    window.setTimeout(onClose, 280);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-5 transition-all duration-300 ${
        visible ? 'bg-on-surface/55 backdrop-blur-md' : 'bg-transparent'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-celebrate-title"
      onClick={handleClose}
    >
      <div
        className={`celebrate-burst relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/40 bg-cream p-8 text-center shadow-[0_25px_80px_rgba(16,28,44,0.35)] transition-all duration-500 ${
          visible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-8 scale-90 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="celebrate-particle absolute h-2 w-2 rounded-full"
              style={{
                left: `${8 + ((i * 37) % 84)}%`,
                background: i % 3 === 0 ? badge.accent : i % 3 === 1 ? '#476649' : '#fea77a',
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>

        <p className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
          Yeni rozet
        </p>
        <h2
          id="badge-celebrate-title"
          className="relative mt-2 font-display text-3xl font-bold italic text-primary"
        >
          Tebrikler!
        </h2>

        <div
          className="celebrate-medal relative mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-full border-4 border-white shadow-organic"
          style={{ background: `${badge.accent}33` }}
        >
          <span
            className="material-symbols-outlined text-6xl"
            style={{
              color: badge.accent,
              fontVariationSettings: "'FILL' 1",
            }}
          >
            {badge.icon}
          </span>
        </div>

        <h3 className="relative mt-5 font-display text-2xl font-semibold text-on-surface">
          {badge.name}
        </h3>
        <p className="relative mt-2 text-sm leading-relaxed text-on-surface-variant">
          {badge.description}
        </p>

        <button
          type="button"
          onClick={handleClose}
          className="relative mt-7 w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-on-primary shadow-soft transition active:scale-95"
        >
          Harika, devam et
        </button>
      </div>
    </div>
  );
}
