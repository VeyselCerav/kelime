'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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

        const response = await fetch(`/api/auth/verify?token=${token}`);
        
        if (response.ok) {
          setStatus('success');
          setMessage('Email adresiniz başarıyla doğrulandı!');
          // 3 saniye sonra login sayfasına yönlendir
          setTimeout(() => {
            router.push('/login?verified=true');
          }, 3000);
        } else {
          const data = await response.json();
          setStatus('error');
          setMessage(data.error || 'Doğrulama işlemi başarısız oldu.');
        }
      } catch (error) {
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
          <div className={`mt-4 p-4 rounded-md ${
            status === 'loading' ? 'bg-blue-50 text-blue-700' :
            status === 'success' ? 'bg-green-50 text-green-700' :
            'bg-red-50 text-red-700'
          }`}>
            {status === 'loading' && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
              </div>
            )}
            <p className="text-center">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 