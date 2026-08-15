'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const MESSAGES: Record<string, string> = {
  Configuration: 'Google girişi yapılandırılmamış. Biraz sonra tekrar dene.',
  AccessDenied: 'Google ile giriş reddedildi veya hesap oluşturulamadı.',
  Verification: 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.',
  OAuthSignin: 'Google oturumu başlatılamadı.',
  OAuthCallback: 'Google geri dönüşünde hata oluştu. Tekrar dene.',
  OAuthCreateAccount: 'Google hesabınla kayıt oluşturulamadı.',
  OAuthAccountNotLinked:
    'Bu e-posta başka bir giriş yöntemiyle kayıtlı. Şifre ile giriş yap.',
  Callback: 'Google geri dönüşü tamamlanamadı.',
  Default: 'Giriş sırasında bir hata oluştu.',
};

function ErrorBody() {
  const params = useSearchParams();
  const code = params.get('error') || 'Default';
  const message = MESSAGES[code] || MESSAGES.Default;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6">
      <div className="paper-texture w-full max-w-md rounded-card border border-outline-variant/40 p-8 text-center shadow-soft">
        <span className="material-symbols-outlined text-4xl text-error">
          error
        </span>
        <h1 className="mt-3 font-display text-2xl font-bold text-on-surface">
          Google ile giriş
        </h1>
        <p className="mt-3 text-sm text-on-surface-variant">{message}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/login"
            className="btn-tactile rounded-full bg-primary py-3 text-sm font-bold text-on-primary"
          >
            Giriş sayfasına dön
          </Link>
          <Link
            href="/register"
            className="btn-tactile rounded-full border border-outline-variant/50 py-3 text-sm font-bold text-on-surface"
          >
            Kayıt ol
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <ErrorBody />
    </Suspense>
  );
}
