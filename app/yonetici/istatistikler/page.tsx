'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Statistics {
  totalUsers: number;
  totalWords: number;
  totalLearnedWords: number;
  totalUnlearnedWords: number;
  totalDailyGoals: number;
  weeklyStats: {
    week: number;
    wordCount: number;
  }[];
  last7DaysLearnedWords: number;
}

export default function StatisticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.replace('/login');
      return;
    }

    if (!session.user?.isAdmin) {
      router.replace('/');
      return;
    }

    fetchStatistics();
  }, [session, status, router]);

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/admin/statistics');
      if (!response.ok) {
        throw new Error('İstatistikler yüklenirken bir hata oluştu');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl">Yükleniyor...</div>
    </div>;
  }

  if (!session || !session.user?.isAdmin) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sistem İstatistikleri</h1>
        <button
          onClick={() => router.back()}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
        >
          Geri Dön
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Genel İstatistikler</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Toplam Kullanıcı:</span>
                <span className="font-semibold">{stats.totalUsers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Toplam Kelime:</span>
                <span className="font-semibold">{stats.totalWords}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Öğrenilen Kelimeler:</span>
                <span className="font-semibold">{stats.totalLearnedWords}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Ezberlenemeyen Kelimeler:</span>
                <span className="font-semibold">{stats.totalUnlearnedWords}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tamamlanan Günlük Hedefler:</span>
                <span className="font-semibold">{stats.totalDailyGoals}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Son 7 Günde Öğrenilen:</span>
                <span className="font-semibold">{stats.last7DaysLearnedWords}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Haftalık İstatistikler</h2>
            <div className="space-y-4">
              {stats.weeklyStats.map((week) => (
                <div key={week.week} className="border-b pb-2">
                  <h3 className="font-medium mb-2">{week.week}. Hafta</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Kelime Sayısı:</span>
                    <span>{week.wordCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 