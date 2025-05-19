'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        if (!token) {
          setStatus('error');
          setMessage('Doğrulama tokeni bulunamadı.');
          return;
        }

        const response = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`);
        const data = await response.json();
        
        if (response.ok) {
          setStatus('success');
          setMessage('Email adresiniz başarıyla doğrulandı! Giriş yapabilirsiniz.');
          // 3 saniye sonra login sayfasına yönlendir
          setTimeout(() => {
            router.push('/login?verified=true');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Doğrulama işlemi başarısız oldu.');
          console.error('Doğrulama hatası:', data);
        }
      } catch (error) {
        console.error('Doğrulama işlemi hatası:', error);
        setStatus('error');
        setMessage('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Doğrulama
          </h2>
        </div>

        <div className={`rounded-md p-4 ${
          status === 'loading' ? 'bg-blue-50' :
          status === 'success' ? 'bg-green-50' :
          'bg-red-50'
        }`}>
          {status === 'loading' && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-green-700 text-center">
              <p className="text-sm font-medium">{message}</p>
              <p className="mt-2 text-sm">
                Yönlendiriliyorsunuz...
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-red-700 text-center">
              <p className="text-sm font-medium">{message}</p>
              <Link 
                href="/login" 
                className="mt-4 inline-block text-sm font-medium text-red-700 hover:text-red-600"
              >
                Giriş sayfasına dön
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 