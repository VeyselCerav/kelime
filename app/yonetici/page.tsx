'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
      <h1 className="text-2xl font-bold mb-4">Yönetici Paneli</h1>
      <p className="mb-4">Hoş geldiniz, {session.user.username}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Kelime Yönetimi</h2>
          <div className="space-y-4">
            <button className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
              Yeni Kelime Ekle
            </button>
            <button className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
              Kelimeleri Listele
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Kullanıcı Yönetimi</h2>
          <div className="space-y-4">
            <button className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition">
              Kullanıcıları Listele
            </button>
            <button className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition">
              İstatistikleri Görüntüle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 