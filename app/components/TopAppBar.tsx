'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useModule } from '../context/ModuleContext';

interface TopAppBarProps {
  title?: string;
  showBack?: boolean;
  subtitle?: string;
}

export default function TopAppBar({
  title = 'YDS Monster',
  showBack = false,
  subtitle,
}: TopAppBarProps) {
  const { data: session } = useSession();
  const { selectedModule } = useModule();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = menuRef.current;
      if (el && !el.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const isAdmin = Boolean(session?.user?.isAdmin);

  return (
    <header className="sticky top-0 z-50 flex w-full items-center justify-between bg-surface-container-lowest/95 px-gutter py-2 shadow-sm backdrop-blur">
      <div className="relative flex min-w-0 items-center gap-2" ref={menuRef}>
        {showBack ? (
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-primary-container/10 active:scale-95"
            aria-label="Geri"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-primary transition hover:bg-primary-container/10 active:scale-95"
            aria-label="Menü"
            aria-expanded={menuOpen}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-[22px] font-bold italic leading-tight tracking-tight text-primary sm:text-[28px]">
            {title}
          </p>
          {(subtitle || selectedModule) && (
            <p className="truncate text-xs font-medium text-on-surface-variant">
              {subtitle || selectedModule?.name}
            </p>
          )}
        </div>

        {menuOpen && !showBack && (
          <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-soft">
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[22px] text-primary">
                person
              </span>
              Profil
            </Link>
            <Link
              href="/favoriler"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[22px] text-secondary">
                star
              </span>
              Favoriler
            </Link>
            <Link
              href="/stats"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[22px] text-primary">
                bar_chart
              </span>
              İstatistik
            </Link>
            {isAdmin && (
              <Link
                href="/yonetici"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 border-t border-outline-variant/30 px-4 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[22px] text-tertiary">
                  admin_panel_settings
                </span>
                Admin
              </Link>
            )}
          </div>
        )}
      </div>

      <Link
        href={session ? '/profile' : '/login'}
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary-container bg-primary-container/20 text-sm font-bold text-primary"
      >
        {session?.user?.name?.[0]?.toUpperCase() ||
          session?.user?.email?.[0]?.toUpperCase() ||
          '?'}
      </Link>
    </header>
  );
}
