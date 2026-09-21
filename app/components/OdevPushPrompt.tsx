'use client';

import { useCallback, useEffect, useState } from 'react';
import { useModule } from '../context/ModuleContext';
import { isOdevSlug } from '@/lib/odev';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Ödev yetkisi olan kullanıcılara saatlik Web Push izni ister.
 * PWA kısayolu + Notification + PushSubscription.
 */
export default function OdevPushPrompt() {
  const { selectedModule } = useModule();
  const [eligible, setEligible] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState('');

  const isOdev = isOdevSlug(selectedModule?.slug);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/push/subscribe', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      setEligible(Boolean(data.eligible));
      setSubscribed(Boolean(data.subscribed));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isOdev) return;
    void refreshStatus();
  }, [isOdev, refreshStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(sessionStorage.getItem('odev-push-dismissed') === '1');
  }, []);

  const subscribe = async () => {
    setBusy(true);
    setError('');
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setError('Bu tarayıcı Web Push desteklemiyor.');
        return;
      }
      if (!window.isSecureContext) {
        setError('Bildirim için HTTPS gerekir.');
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setError('Bildirim izni verilmedi.');
        return;
      }

      const keyRes = await fetch('/api/push/vapid-public-key', {
        cache: 'no-store',
      });
      if (!keyRes.ok) {
        setError('Bildirim anahtarı yok (VAPID).');
        return;
      }
      const { publicKey } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      const json = sub.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Abonelik kaydedilemedi');
      }
      setSubscribed(true);
      sessionStorage.removeItem('odev-push-dismissed');
      setDismissed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bildirim açılamadı');
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    sessionStorage.setItem('odev-push-dismissed', '1');
    setDismissed(true);
  };

  if (!isOdev || !eligible || subscribed || dismissed) return null;

  return (
    <div className="mx-auto mb-3 max-w-lg rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 shadow-sm">
      <p className="text-sm font-medium text-on-surface">
        Saatlik hatırlatma
      </p>
      <p className="mt-1 text-xs text-on-surface-variant">
        08:00–22:00 arası her saat başı “Tekrar seni bekliyor” bildirimi al.
        Ana ekran kısayolu + bildirim izni gerekir.
      </p>
      {error ? (
        <p className="mt-2 text-xs text-error">{error}</p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void subscribe()}
          className="btn-tactile rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary disabled:opacity-60"
        >
          {busy ? 'Açılıyor…' : 'Bildirimleri aç'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full px-3 py-2 text-xs text-on-surface-variant"
        >
          Sonra
        </button>
      </div>
    </div>
  );
}
