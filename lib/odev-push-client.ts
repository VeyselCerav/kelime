/** Tarayıcıda Ödev Web Push aboneliği aç/kapa */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function fetchOdevPushStatus(): Promise<{
  eligible: boolean;
  subscribed: boolean;
}> {
  const res = await fetch('/api/push/subscribe', {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) return { eligible: false, subscribed: false };
  const data = await res.json();
  return {
    eligible: Boolean(data.eligible),
    subscribed: Boolean(data.subscribed),
  };
}

export async function subscribeOdevPush(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Tarayıcı gerekli');
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Bu tarayıcı Web Push desteklemiyor.');
  }
  if (!window.isSecureContext) {
    throw new Error('Bildirim için HTTPS gerekir.');
  }

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error('Bildirim izni verilmedi.');
  }

  const keyRes = await fetch('/api/push/vapid-public-key', { cache: 'no-store' });
  if (!keyRes.ok) {
    throw new Error('Bildirim anahtarı yok (VAPID).');
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
}

export async function unsubscribeOdevPush(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Tarayıcı gerekli');
  }

  let endpoint: string | undefined;
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => {});
      }
    } catch {
      /* ignore SW errors; still clear DB */
    }
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(endpoint ? { endpoint } : {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Bildirim kapatılamadı');
  }
}
