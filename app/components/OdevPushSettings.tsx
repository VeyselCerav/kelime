'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchOdevPushStatus,
  subscribeOdevPush,
  unsubscribeOdevPush,
} from '@/lib/odev-push-client';

type Props = {
  /** compact: Kartlar bandı; full: Profil ayar satırı */
  variant?: 'full' | 'compact';
  /** compact iken abone ise gizle */
  hideWhenSubscribed?: boolean;
  onDismiss?: () => void;
};

async function sendTestPush(welcome = false) {
  const res = await fetch('/api/push/test', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ welcome }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Test gönderilemedi');
}

/**
 * Ödev yetkisi olan kullanıcılarda saatlik push aç/kapa.
 */
export default function OdevPushSettings({
  variant = 'full',
  hideWhenSubscribed = false,
  onDismiss,
}: Props) {
  const [eligible, setEligible] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await fetchOdevPushStatus();
      setEligible(s.eligible);
      setSubscribed(s.subscribed);
    } catch {
      setEligible(false);
      setSubscribed(false);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Varsayılan açık: izin verilmişse otomatik abone ol
  useEffect(() => {
    if (!loaded || !eligible || subscribed) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    void (async () => {
      try {
        await subscribeOdevPush();
        setSubscribed(true);
        await sendTestPush(true);
        setInfo('Bildirimler açıldı; test gönderildi.');
      } catch {
        /* ignore */
      }
    })();
  }, [loaded, eligible, subscribed]);

  const toggle = async () => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (subscribed) {
        await unsubscribeOdevPush();
        setSubscribed(false);
        setInfo('Bildirimler kapatıldı.');
      } else {
        await subscribeOdevPush();
        setSubscribed(true);
        sessionStorage.removeItem('odev-push-dismissed');
        await sendTestPush(true);
        setInfo('Bildirimler açıldı; ilk bildirim gönderildi.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setError('');
    setInfo('');
    try {
      if (!subscribed) {
        await subscribeOdevPush();
        setSubscribed(true);
      }
      await sendTestPush(false);
      setInfo('Test bildirimi gönderildi. Bildirim çekmecesini kontrol et.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test başarısız');
    } finally {
      setTesting(false);
    }
  };

  if (!loaded || !eligible) return null;
  if (hideWhenSubscribed && subscribed) return null;

  if (variant === 'compact') {
    return (
      <div className="mx-auto mb-3 max-w-lg rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 shadow-sm">
        <p className="text-sm font-medium text-on-surface">Saatlik hatırlatma</p>
        <p className="mt-1 text-xs text-on-surface-variant">
          08:00–22:00 arası “Tekrar seni bekliyor”. Varsayılan olarak açık
          tutulur; Profil’den kapatabilirsin.
        </p>
        {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggle()}
            className="btn-tactile rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary disabled:opacity-60"
          >
            {busy ? 'Açılıyor…' : 'Bildirimleri aç'}
          </button>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full px-3 py-2 text-xs text-on-surface-variant"
            >
              Sonra
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <section className="mb-6 rounded-[24px] border border-outline-variant/40 bg-surface-container-low p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-on-surface">Ödev bildirimleri</h2>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            Varsayılan: açık. 08:00–22:00 her saat “Tekrar seni bekliyor”. Ana
            ekran kısayolu (PWA) önerilir.
          </p>
          {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
          {info ? <p className="mt-2 text-xs text-primary">{info}</p> : null}
          <p className="mt-2 text-[11px] text-outline">
            Durum: {subscribed ? 'Açık' : 'Kapalı'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={subscribed}
          aria-label="Ödev bildirimleri"
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            subscribed ? 'bg-primary' : 'bg-surface-container-highest'
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              subscribed ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      <button
        type="button"
        disabled={testing || busy}
        onClick={() => void test()}
        className="btn-tactile mt-4 w-full rounded-full border border-outline-variant py-2.5 text-xs font-semibold text-on-surface disabled:opacity-60"
      >
        {testing ? 'Gönderiliyor…' : 'Test bildirimi gönder'}
      </button>
    </section>
  );
}
