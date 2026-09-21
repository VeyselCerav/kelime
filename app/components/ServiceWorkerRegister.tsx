'use client';

import { useEffect, useState } from 'react';

/**
 * SW kaydı + yeni sürümde otomatik yenileme.
 * Takılırsa ekranda “Yenile” bandı (özellikle iOS PWA).
 */
export default function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    const ok =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost';
    if (!ok) return;

    let refreshing = false;
    let pollId = 0;

    const activateWaiting = (reg: ServiceWorkerRegistration) => {
      const waiting = reg.waiting;
      if (waiting) {
        waiting.postMessage({ type: 'SKIP_WAITING' });
        setUpdateReady(true);
      }
    };

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const trackInstalling = (reg: ServiceWorkerRegistration) => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            activateWaiting(reg);
            // waiting yoksa installing → waiting geçişi; tekrar bak
            window.setTimeout(() => activateWaiting(reg), 100);
          } else {
            // İlk SW — reload gerekmez
          }
        }
      });
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        void reg.update().then(() => activateWaiting(reg)).catch(() => {});
      });
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange
    );
    document.addEventListener('visibilitychange', onVisible);

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        activateWaiting(reg);
        trackInstalling(reg);
        reg.addEventListener('updatefound', () => trackInstalling(reg));

        void reg.update().then(() => activateWaiting(reg)).catch(() => {});
        pollId = window.setInterval(() => {
          void reg.update().then(() => activateWaiting(reg)).catch(() => {});
        }, 30_000);
      })
      .catch((err) => {
        console.warn('SW kayıt hatası:', err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange
      );
      document.removeEventListener('visibilitychange', onVisible);
      if (pollId) window.clearInterval(pollId);
    };
  }, []);

  const forceReload = () => {
    void navigator.serviceWorker.getRegistration().then(async (reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      // iOS: bazen unregister + reload gerekir
      try {
        await reg?.unregister();
      } catch {
        /* ignore */
      }
      window.location.reload();
    });
  };

  if (!updateReady) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={forceReload}
        className="btn-tactile flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-lg"
      >
        Yeni sürüm hazır — Yenile
        <span className="material-symbols-outlined text-[20px]">refresh</span>
      </button>
    </div>
  );
}
