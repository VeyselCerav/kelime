'use client';

import { SessionProvider } from 'next-auth/react';
import ServiceWorkerRegister from './components/ServiceWorkerRegister';
import InstallPrompt from './components/InstallPrompt';

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: unknown;
}) {
  return (
    <SessionProvider session={session as never}>
      <ServiceWorkerRegister />
      {children}
      <InstallPrompt />
    </SessionProvider>
  );
}
