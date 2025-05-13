'use client';

import Navbar from './components/Navbar';
import { WeekProvider } from './context/WeekContext';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WeekProvider>
      <Navbar />
      <main className="min-h-screen bg-base-100">
        {children}
      </main>
    </WeekProvider>
  );
} 