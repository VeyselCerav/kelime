'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const DISMISS_KEY = 'yds-pwa-install-dismissed';
const OPEN_KEY = 'yds-pwa-install-open';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  );
}

/** İlk ziyarette ana ekrana ekleme — kapanana kadar sabit kalır */
export default function InstallPrompt() {
  const pathname = usePathname();
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);

  const hasBottomNav =
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/register') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/yonetici');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) {
      setVisible(false);
      return;
    }
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    // Remount olsa bile açık kalsın
    if (sessionStorage.getItem(OPEN_KEY) === '1') {
      setVisible(true);
      if (isIos()) setShowIosSteps(true);
    }

    const open = () => {
      sessionStorage.setItem(OPEN_KEY, '1');
      setVisible(true);
      if (isIos()) setShowIosSteps(true);
    };

    const onBip = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setHasNativePrompt(true);
      open();
    };

    window.addEventListener('beforeinstallprompt', onBip);

    const onInstalled = () => {
      localStorage.setItem(DISMISS_KEY, '1');
      sessionStorage.removeItem(OPEN_KEY);
      setVisible(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    const t = window.setTimeout(() => {
      if (isStandalone()) return;
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
      open();
    }, 1800);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    sessionStorage.removeItem(OPEN_KEY);
    setVisible(false);
  };

  const install = async () => {
    const deferred = deferredRef.current;
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        dismiss();
      }
      deferredRef.current = null;
      setHasNativePrompt(false);
      return;
    }
    setShowIosSteps(true);
  };

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[100] px-4"
      style={{
        // Alt menünün üstünde dursun — kaybolmuş gibi görünmesin
        bottom: hasBottomNav
          ? 'calc(5.5rem + env(safe-area-inset-bottom, 0px))'
          : 'calc(1rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-[0_8px_32px_rgba(16,28,44,0.18)]">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-container/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold text-on-surface">
              Ana ekrana ekle
            </p>
            <p className="mt-0.5 text-sm text-on-surface-variant">
              {showIosSteps
                ? 'Safari’de Paylaş → “Ana Ekrana Ekle”.'
                : 'Kısayol ekle; telefonunda uygulama gibi açılsın.'}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {showIosSteps && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-on-surface-variant">
            <li>
              Alttaki <strong>Paylaş</strong> simgesine dokun
            </li>
            <li>
              <strong>Ana Ekrana Ekle</strong> seçeneğini seç
            </li>
            <li>
              <strong>Ekle</strong> ile onayla
            </li>
          </ol>
        )}

        <div className="mt-4 flex gap-2">
          {!showIosSteps && (
            <button
              type="button"
              onClick={() => void install()}
              className="btn-tactile flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-on-primary"
            >
              {hasNativePrompt ? 'Ekle' : 'Nasıl eklerim?'}
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className={`btn-tactile rounded-xl border border-outline-variant/50 px-4 py-2.5 text-sm font-bold text-on-surface-variant ${
              showIosSteps ? 'flex-1' : ''
            }`}
          >
            {showIosSteps ? 'Anladım' : 'Sonra'}
          </button>
        </div>
      </div>
    </div>
  );
}
