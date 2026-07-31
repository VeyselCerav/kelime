'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.replace('/login');
      return;
    }

    if (!session.user?.isAdmin) {
      console.log('Admin yetkisi yok:', session);
      router.replace('/');
      return;
    }
  }, [session, status, router]);

  const handleAddWord = () => {
    router.push('/yonetici/kelime-ekle');
  };

  const handleListWords = () => {
    router.push('/yonetici/kelimeler');
  };

  const handleListUsers = () => {
    router.push('/yonetici/kullanicilar');
  };

  const handleViewStats = () => {
    router.push('/yonetici/istatistikler');
  };

  const handleSignOut = () => {
    void signOut({ callbackUrl: '/login' });
  };

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl">Yükleniyor...</div>
    </div>;
  }

  if (!session || !session.user?.isAdmin) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Yönetici Paneli</h1>
          <p className="mt-1">Hoş geldiniz, {session.user.username}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Çıkış Yap
        </button>
      </div>
      
      {message && (
        <div className={`mb-4 p-4 rounded ${
          message.startsWith('Hata') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Kelime Yönetimi</h2>
          <div className="space-y-4">
            <button
              onClick={handleAddWord}
              disabled={isLoading}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
            >
              Yeni Kelime Ekle
            </button>
            <button
              onClick={handleListWords}
              disabled={isLoading}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition disabled:opacity-50"
            >
              Kelimeleri Listele
            </button>
            <button
              type="button"
              onClick={() => router.push('/yonetici/moduller')}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50"
            >
              Modül Ekle / Yönet
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Kullanıcı Yönetimi</h2>
          <div className="space-y-4">
            <button
              onClick={handleListUsers}
              disabled={isLoading}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition disabled:opacity-50"
            >
              Kullanıcıları Listele
            </button>
            <button
              onClick={handleViewStats}
              disabled={isLoading}
              className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition disabled:opacity-50"
            >
              İstatistikleri Görüntüle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 