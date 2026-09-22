'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  fetchOdevPushStatus,
  subscribeOdevPush,
} from '@/lib/odev-push-client';

const AUTO_KEY = 'odev-push-auto-attempted';

/**
 * Ödev yetkisi olanlarda bildirim varsayılan açık:
 * - İzin zaten varsa sessizce abone ol + hoş geldin push
 * - İzin yoksa bir kez onay bandı göster (tek dokunuşla aç)
 */
export default function OdevPushAutoEnable() {
  const { status } = useSession();
  const [showBanner, setShowBanner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ranRef = useRef(false);

  const sendWelcome = useCallback(async () => {
    try {
      await fetch('/api/push/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ welcome: true }),
      });
    } catch {
      /* ignore */
    }
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await subscribeOdevPush();
      setShowBanner(false);
      sessionStorage.setItem(AUTO_KEY, '1');
      await sendWelcome();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bildirim açılamadı');
    } finally {
      setBusy(false);
    }
  }, [sendWelcome]);

  useEffect(() => {
    if (status !== 'authenticated' || ranRef.current) return;
    ranRef.current = true;

    void (async () => {
      try {
        const s = await fetchOdevPushStatus();
        if (!s.eligible) return;
        if (s.subscribed) return;

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          await subscribeOdevPush();
          await sendWelcome();
          return;
        }

        if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
          return;
        }

        // Varsayılan: kullanıcıya tek dokunuşla açma bandı
        if (sessionStorage.getItem(AUTO_KEY) === 'dismissed') return;
        setShowBanner(true);
      } catch {
        /* ignore */
      }
    })();
  }, [status, sendWelcome]);

  if (!showBanner) return null;

  return (
    <div className="fixed inset-x-0 bottom-[5.5rem] z-[90] flex justify-center px-3 pb-[env(safe-area-inset-bottom)] sm:bottom-24">
      <div className="w-full max-w-md rounded-2xl border border-primary/30 bg-surface-container-lowest p-4 shadow-lg">
        <p className="text-sm font-semibold text-on-surface">
          Ödev bildirimleri açık gelsin
        </p>
        <p className="mt-1 text-xs text-on-surface-variant">
          08:00–22:00 her saat “Tekrar seni bekliyor”. İstediğin zaman Profil’den
          kapatabilirsin.
        </p>
        {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void enable()}
            className="btn-tactile flex-1 rounded-full bg-primary py-2.5 text-xs font-semibold text-on-primary disabled:opacity-60"
          >
            {busy ? 'Açılıyor…' : 'Bildirimleri aç'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              sessionStorage.setItem(AUTO_KEY, 'dismissed');
              setShowBanner(false);
            }}
            className="rounded-full px-3 py-2 text-xs text-on-surface-variant"
          >
            Sonra
          </button>
        </div>
      </div>
    </div>
  );
}
