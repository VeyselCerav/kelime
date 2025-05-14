import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from './ClientLayout';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Kelime Öğrenme",
  description: "İngilizce kelime öğrenme uygulaması",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" data-theme="light" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
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
            top: -9999px !important;
            width: 0 !important;
            height: 0 !important;
            max-width: 0 !important;
            max-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            outline: none !important;
            clip: rect(0 0 0 0) !important;
            -webkit-clip-path: inset(50%) !important;
            clip-path: inset(50%) !important;
          }
        `}} />
      </head>
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
