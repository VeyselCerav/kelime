'use client';

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

  return (
    <header className="sticky top-0 z-50 flex w-full items-center justify-between bg-surface-container-lowest/95 px-gutter py-2 shadow-sm backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        {showBack ? (
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-primary-container/10 active:scale-95"
            aria-label="Geri"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
        ) : (
          <Link
            href={session?.user?.isAdmin ? '/yonetici' : '/profile'}
            className="flex h-10 w-10 items-center justify-center rounded-full text-primary transition hover:bg-primary-container/10 active:scale-95"
            aria-label="Menü"
          >
            <span className="material-symbols-outlined">menu</span>
          </Link>
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
