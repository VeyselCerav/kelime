'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Kayıt olurken bir hata oluştu');
      }

      setFormData({ username: '', email: '', password: '', confirmPassword: '' });
      setSuccess(
        'Kayıt başarılı! E-postandaki doğrulama mailini kontrol et.'
      );
      setTimeout(() => router.push('/login?registered=true'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt olurken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'mt-1 w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Kullanıcı adı
          </label>
          <input
            id="username"
            type="text"
            required
            className={inputClass}
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            E-posta
          </label>
          <input
            id="email"
            type="email"
            required
            className={inputClass}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Şifre
          </label>
          <input
            id="password"
            type="password"
            required
            className={inputClass}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Şifre tekrar
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            className={inputClass}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
        )}
        {success && (
          <div className="rounded-2xl bg-primary-container/20 px-4 py-3 text-sm text-on-primary-container">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-tactile flex w-full justify-center rounded-full bg-primary py-3.5 text-sm font-semibold text-on-primary shadow-soft disabled:opacity-50"
        >
          {isLoading ? 'Kayıt yapılıyor…' : 'Kayıt Ol'}
        </button>
      </form>

      <div className="relative my-2">
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
        onClick={() => signIn('google', { callbackUrl: '/' })}
        className="btn-tactile flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest py-3.5 text-sm font-semibold text-on-surface"
      >
        <img src="https://www.google.com/favicon.ico" alt="" className="h-5 w-5" />
        Google ile devam et
      </button>

      <p className="text-center text-sm text-on-surface-variant">
        Zaten hesabın var mı?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
