'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'yds-pwa-install-dismissed';

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

/** İlk ziyarette ana ekrana ekleme teşviki */
export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    const t = window.setTimeout(() => {
      if (isStandalone()) return;
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
      setVisible(true);
      if (isIos()) setShowIosSteps(true);
    }, 2200);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        localStorage.setItem(DISMISS_KEY, '1');
        setVisible(false);
      }
      setDeferred(null);
      return;
    }
    setShowIosSteps(true);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-[0_-8px_30px_rgba(16,28,44,0.12)]">
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
                ? 'Safari’de Paylaş menüsünden “Ana Ekrana Ekle”.'
                : 'Kısayol ekle; telefonunda uygulama gibi açılsın.'}
            </p>
          </div>
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
              {deferred ? 'Ekle' : 'Nasıl eklerim?'}
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
