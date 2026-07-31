'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { ModuleProvider } from './context/ModuleContext';
import { BadgeProvider } from './context/BadgeContext';
import BottomNav from './components/BottomNav';
import TopAppBar from './components/TopAppBar';

const bareRoutes = ['/login', '/register'];
const authRoutes = ['/auth'];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const pathname = usePathname();

  const isBare =
    bareRoutes.includes(pathname) ||
    authRoutes.some((p) => pathname.startsWith(p));
  const isAdmin = pathname.startsWith('/yonetici');

  // Auth ekranlarında shell / API çağrıları yok
  if (isBare) {
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Middleware zaten yönlendirir; yine de güvenli boş durum
  if (status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ModuleProvider>
      <BadgeProvider>
        <div className="flex min-h-screen flex-col bg-surface text-on-surface">
          {!isAdmin && <TopAppBar />}
          <main className={`flex-1 ${!isAdmin ? 'pb-28 pt-2' : ''}`}>
            {children}
          </main>
          {!isAdmin && <BottomNav />}
        </div>
      </BadgeProvider>
    </ModuleProvider>
  );
}
