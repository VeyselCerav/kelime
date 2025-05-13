import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from './ClientLayout';
import Script from 'next/script';

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
        <style>{`
          /* Next.js Dev Tools'u gizle */
          :root {
            --removed-next-dev-tools: none !important;
          }

          /* Tüm Next.js Dev Tools elementlerini gizle */
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
            /* Görünürlüğü tamamen kaldır */
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
        `}</style>
      </head>
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
        <Script
          id="remove-nextjs-dev"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function removeDevTools() {
                  const selectors = [
                    // Next.js Dev Tools elementlerini seç
                    '[data-next-badge-root]',
                    '[data-next-badge]',
                    '[data-next-mark]',
                    '#__next-build-watcher',
                    '[data-nextjs-dev-tools-button]',
                    '[data-nextjs-dev-tools]',
                    '[data-nextjs-dev-tools-modal]',
                    '[data-nextjs-toast]',
                    '[data-nextjs-toast-wrapper]',
                    '[data-nextjs-portal]',
                    '[data-nextjs-dialog]',
                    '[data-nextjs-errors]',
                    '.N',
                    'button[data-nextjs-dev-tools-button]',
                    'div[data-nextjs-dev-tools]',
                    'div[data-next-badge-root]',
                    'button[data-next-mark]',
                    '[data-nextjs-dev-tools-emulator-container]',
                    '[data-nextjs-dev-tools-badge]',
                    'div[data-next-badge="true"]'
                  ];
                  
                  // Her bir seçiciyi bul ve elementleri kaldır
                  selectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                      if (el && el.parentNode) {
                        // Elementi DOM'dan kaldır
                        el.remove();
                      }
                    });
                  });
                }

                // İlk çalıştırma
                removeDevTools();

                // Sürekli kontrol (10ms aralıklarla)
                const interval = setInterval(removeDevTools, 10);

                // DOM değişikliklerini izle
                const observer = new MutationObserver((mutations) => {
                  mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                      removeDevTools();
                    }
                  });
                });

                // Tüm DOM değişikliklerini izle
                observer.observe(document.documentElement, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  characterData: true
                });

                // Sayfa yüklenme olaylarında tekrar çalıştır
                window.addEventListener('load', removeDevTools);
                window.addEventListener('DOMContentLoaded', removeDevTools);
                document.addEventListener('readystatechange', removeDevTools);
              })();
            `
          }}
        />
        {/* Next.js Dev Tools butonunu gizle */}
        {/*
        <div data-next-badge="true" data-error="false" data-error-expanded="false" data-animate="false" style="width: 36px;">
          <div>
            <button data-next-mark="true" data-next-mark-loading="false" aria-haspopup="menu" aria-expanded="false" aria-controls="nextjs-dev-tools-menu" aria-label="Open Next.js Dev Tools" data-nextjs-dev-tools-button="true">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" data-next-mark-loading="false">
                <g transform="translate(8.5, 13)">
                  <path class="paused" d="M13.3 15.2 L2.34 1 V12.6" fill="none" stroke="url(#next_logo_paint0_linear_1357_10853)" stroke-width="1.86" mask="url(#next_logo_mask0)" stroke-dasharray="29.6" stroke-dashoffset="29.6"></path>
                  <path class="paused" d="M11.825 1.5 V13.1" stroke-width="1.86" stroke="url(#next_logo_paint1_linear_1357_10853)" stroke-dasharray="11.6" stroke-dashoffset="11.6"></path>
                </g>
                <defs>
                  <linearGradient id="next_logo_paint0_linear_1357_10853" x1="9.95555" y1="11.1226" x2="15.4778" y2="17.9671" gradientUnits="userSpaceOnUse">
                    <stop stop-color="white"></stop>
                    <stop offset="0.604072" stop-color="white" stop-opacity="0"></stop>
                    <stop offset="1" stop-color="white" stop-opacity="0"></stop>
                  </linearGradient>
                  <linearGradient id="next_logo_paint1_linear_1357_10853" x1="11.8222" y1="1.40039" x2="11.791" y2="9.62542" gradientUnits="userSpaceOnUse">
                    <stop stop-color="white"></stop>
                    <stop offset="1" stop-color="white" stop-opacity="0"></stop>
                  </linearGradient>
                  <mask id="next_logo_mask0">
                    <rect width="100%" height="100%" fill="white"></rect>
                    <rect width="5" height="1.5" fill="black"></rect>
                  </mask>
                </defs>
              </svg>
            </button>
          </div>
        </div>
        */}
      </body>
    </html>
  );
}
