'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignOutPage() {
  const [countdown, setCountdown] = useState(5);
  const router = useRouter();

  useEffect(() => {
    // Otomatik çıkış yap
    signOut({ redirect: false });

    // Geri sayım başlat
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl transform transition-all">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 mb-6">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-indigo-600 rounded-full animate-spin"
                style={{ 
                  clipPath: 'polygon(50% 0%, 50% 50%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)',
                  animation: 'spin 2s linear infinite'
                }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-indigo-600">{countdown}</span>
              </div>
            </div>
          </div>
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 mb-2">
            Güle güle!
          </h2>
          
          <p className="text-sm text-gray-600 mb-8">
            Başarıyla çıkış yaptınız. {countdown} saniye içinde ana sayfaya yönlendirileceksiniz.
          </p>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                veya
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push('/')}
            className="mt-8 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    </div>
  );
} 