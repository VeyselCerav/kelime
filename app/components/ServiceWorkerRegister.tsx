'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Sadece production / https veya localhost
    const ok =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost';
    if (!ok) return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW kayıt hatası:', err);
    });
  }, []);

  return null;
}
