'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Ana', icon: 'home' },
  { href: '/flashcards', label: 'Kartlar', icon: 'library_books' },
  { href: '/quiz', label: 'Quiz', icon: 'quiz' },
  { href: '/sinav', label: 'Sınav', icon: 'assignment' },
  { href: '/stats', label: 'İstat.', icon: 'query_stats' },
];

export default function BottomNav() {
  const pathname = usePathname();

  const hideOn = ['/login', '/register', '/auth'];
  if (hideOn.some((p) => pathname.startsWith(p))) return null;
  if (pathname.startsWith('/yonetici')) return null;

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-[24px] bg-surface-container-low px-2 pb-6 pt-3 shadow-[0_-4px_12px_rgba(30,42,58,0.05)] sm:px-container-margin">
      {items.map((item) => {
        const active =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center px-1 py-1.5 transition-all sm:px-2 ${
              active
                ? 'rounded-xl bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:text-secondary'
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={
                active
                  ? { fontVariationSettings: "'FILL' 1" }
                  : undefined
              }
            >
              {item.icon}
            </span>
            <span className="mt-0.5 truncate text-[10px] font-bold tracking-wide sm:text-[11px]">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
