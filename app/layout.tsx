import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import Providers from './providers';
import ClientLayout from './ClientLayout';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'YDS Monster',
  description: 'Mobil kelime kartları ve test uygulaması',
  applicationName: 'YDS Monster',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'YDS Monster',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#476649' },
    { media: '(prefers-color-scheme: dark)', color: '#476649' },
  ],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  icons: {
    icon: [
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="tr" data-theme="yds" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          :root { --removed-next-dev-tools: none !important; }
          [data-next-badge-root],
          [data-next-badge],
          [data-next-mark],
          #__next-build-watcher,
          [data-nextjs-dev-tools-button],
          [data-nextjs-dev-tools],
          [data-nextjs-dev-tools-modal],
          [data-nextjs-toast],
          [data-nextjs-toast-wrapper],
          [data-nextjs-portal],
          [data-nextjs-dialog],
          [data-nextjs-errors],
          .N,
          button[data-nextjs-dev-tools-button],
          div[data-nextjs-dev-tools],
          div[data-next-badge-root],
          button[data-next-mark],
          [data-nextjs-dev-tools-emulator-container],
          [data-nextjs-dev-tools-badge],
          div[data-next-badge="true"] {
            display: var(--removed-next-dev-tools) !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: absolute !important;
            left: -9999px !important;
            width: 0 !important;
            height: 0 !important;
          }
        `,
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${playfair.variable} font-body antialiased`}>
        <Providers session={session}>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
