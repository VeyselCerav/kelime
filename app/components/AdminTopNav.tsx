'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Ana sayfa', icon: 'home' },
  { href: '/yonetici', label: 'Panel', icon: 'dashboard' },
  { href: '/yonetici/moduller', label: 'Modüller', icon: 'folder' },
  { href: '/yonetici/kelimeler', label: 'Kelimeler', icon: 'menu_book' },
  { href: '/yonetici/kullanicilar', label: 'Kullanıcılar', icon: 'group' },
  { href: '/yonetici/istatistikler', label: 'İstatistik', icon: 'analytics' },
];

/** Yönetici sayfalarında üst sekme çubuğu */
export default function AdminTopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant/30 bg-surface-container-lowest/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="font-display text-lg font-bold text-primary">
            Yönetici
          </p>
          <p className="text-xs text-on-surface-variant">YDS Monster</p>
        </div>
        <Link
          href="/"
          className="btn-tactile inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-on-primary"
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          Ana sayfaya dön
        </Link>
      </div>
      <nav className="no-scrollbar mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-3">
        {LINKS.map((l) => {
          const active =
            l.href === '/'
              ? false
              : l.href === '/yonetici'
                ? pathname === '/yonetici'
                : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`btn-tactile flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                active
                  ? 'bg-primary text-on-primary'
                  : l.href === '/'
                    ? 'border border-outline-variant/40 bg-surface-container text-on-surface'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {l.icon}
              </span>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
