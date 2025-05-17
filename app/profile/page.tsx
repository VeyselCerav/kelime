'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Progress {
  totalWords: number;
  streak: number;
  badges: {
    name: string;
    description: string;
    achieved: boolean;
  }[];
  weeklyData: number[];
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const progressResponse = await fetch('/api/progress');
        if (!progressResponse.ok) {
          throw new Error('İlerleme bilgileri alınamadı');
        }
        const progressData = await progressResponse.json();
        setProgress(progressData);
      } catch (error) {
        console.error('Veri alınamadı:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchData();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const chartData = {
    labels: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'],
    datasets: [
      {
        label: 'Öğrenilen Kelimeler',
        data: progress?.weeklyData || Array(7).fill(0),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8">
        Profil
      </h1>

      {/* İlerleme Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-primary/10">
          <h2 className="text-xl font-semibold mb-2 text-base-content">Toplam İlerleme</h2>
          <p className="text-4xl font-bold text-primary">
            {progress?.totalWords || 0}
          </p>
          <p className="text-base-content/70">öğrenilen kelime</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-primary/10">
          <h2 className="text-xl font-semibold mb-2 text-base-content">Çalışma Serisi</h2>
          <p className="text-4xl font-bold text-secondary">
            {progress?.streak || 0}
          </p>
          <p className="text-base-content/70">gün</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-primary/10">
          <h2 className="text-xl font-semibold mb-2 text-base-content">Rozetler</h2>
          <p className="text-4xl font-bold text-primary">
            {progress?.badges?.filter(b => b.achieved).length || 0}
          </p>
          <p className="text-base-content/70">kazanılan rozet</p>
        </div>
      </div>

      {/* Haftalık İlerleme Grafiği */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-12 border-2 border-primary/10">
        <h2 className="text-xl font-semibold mb-4">Haftalık İlerleme</h2>
        <div className="h-64">
          <Line data={chartData} options={{ 
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1
                }
              }
            }
          }} />
        </div>
      </div>

      {/* Rozetler */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-primary/10">
        <h2 className="text-2xl font-semibold mb-6 text-base-content">Rozetlerim</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {progress?.badges?.map((badge, index) => (
            <div
              key={index}
              className={`p-6 rounded-xl border-2 ${
                badge.achieved
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`text-2xl ${badge.achieved ? 'text-primary' : 'text-gray-400'}`}>
                  🏆
                </div>
                <div>
                  <h3 className={`font-semibold ${badge.achieved ? 'text-primary' : 'text-gray-400'}`}>
                    {badge.name}
                  </h3>
                  <p className={`text-sm ${badge.achieved ? 'text-base-content/70' : 'text-gray-400'}`}>
                    {badge.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 