'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Navbar from './components/Navbar';
import { WeekProvider } from './context/WeekContext';

const publicRoutes = ['/register'];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isPublicRoute = publicRoutes.includes(pathname);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <WeekProvider>
      {(!isPublicRoute || session) && <Navbar />}
      <main className="min-h-screen bg-base-100">
        {children}
      </main>
    </WeekProvider>
  );
} 