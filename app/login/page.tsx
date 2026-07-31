'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const registered = searchParams.get('registered') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push(callbackUrl || '/');
        router.refresh();
      }
    } catch {
      setError('Giriş yapılırken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl, redirect: true });
    } catch {
      setError('Google ile giriş yapılırken bir hata oluştu');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface px-container-margin py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-8 text-center">
          <p className="font-display text-4xl font-bold italic tracking-tight text-primary">
            YDS Monster
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Kelime kartları ve quiz ile YDS hazırlığı
          </p>
        </div>

        <div className="paper-texture soft-shadow rounded-card border border-outline-variant/40 p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-on-surface">
            Hoş geldin
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Hesabına giriş yap ve öğrenmeye devam et
          </p>

          {registered && (
            <div className="mt-4 rounded-2xl border border-primary-container/40 bg-primary-container/15 px-4 py-3 text-sm text-on-primary-container">
              Kayıt tamamlandı. E-postandaki doğrulama bağlantısını kontrol et.
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Kullanıcı adı
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Kullanıcı Adı"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>

            <div className="text-right">
              <Link
                href="/auth/reset-password"
                className="text-sm font-medium text-secondary hover:underline"
              >
                Parolanı mı unuttun?
              </Link>
            </div>

            {error && (
              <div className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-tactile flex w-full items-center justify-center rounded-full bg-primary py-3.5 text-sm font-semibold text-on-primary shadow-soft disabled:opacity-50"
            >
              {isLoading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/60" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#FFFBF5] px-3 font-bold uppercase tracking-wider text-outline">
                veya
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="btn-tactile flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest py-3.5 text-sm font-semibold text-on-surface disabled:opacity-50"
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt=""
              className="h-5 w-5"
            />
            Google ile devam et
          </button>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Hesabın yok mu?{' '}
            <Link
              href="/register"
              className="font-semibold text-primary hover:underline"
            >
              Kayıt ol
            </Link>
          </p>
        </div>

        <Link
          href="/"
          className="mt-6 text-center text-sm font-medium text-on-surface-variant hover:text-primary"
        >
          ← Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
