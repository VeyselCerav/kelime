'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Parola sıfırlama bağlantısı email adresinize gönderildi.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Bir hata oluştu.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Parolanızı Sıfırlayın
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Email adresinizi girin, size parola sıfırlama bağlantısı gönderelim.
          </p>
        </div>

        {status === 'success' && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700 text-center">
              {message}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700 text-center">
              {message}
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email adresi
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email adresi"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {status === 'loading' ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
            </button>
          </div>

          <div className="text-sm text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Giriş sayfasına dön
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 