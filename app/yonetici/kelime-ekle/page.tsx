'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AddWordPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    english: '',
    turkish: '',
    week: '1',
    example: ''
  });

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl">Yükleniyor...</div>
    </div>;
  }

  if (!session || !session.user?.isAdmin) {
    router.replace('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/words/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Kelime eklenirken bir hata oluştu');
      }

      router.push('/yonetici/kelimeler');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Yeni Kelime Ekle</h1>
          <button
            onClick={() => router.push('/yonetici')}
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

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div>
            <label htmlFor="english" className="block text-sm font-medium text-gray-700">
              İngilizce Kelime
            </label>
            <input
              type="text"
              id="english"
              value={formData.english}
              onChange={(e) => setFormData({ ...formData, english: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="turkish" className="block text-sm font-medium text-gray-700">
              Türkçe Anlamı
            </label>
            <input
              type="text"
              id="turkish"
              value={formData.turkish}
              onChange={(e) => setFormData({ ...formData, turkish: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="week" className="block text-sm font-medium text-gray-700">
              Hafta
            </label>
            <select
              id="week"
              value={formData.week}
              onChange={(e) => setFormData({ ...formData, week: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            >
              {[...Array(52)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Hafta {i + 1}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="example" className="block text-sm font-medium text-gray-700">
              Örnek Cümle
            </label>
            <textarea
              id="example"
              value={formData.example}
              onChange={(e) => setFormData({ ...formData, example: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Ekleniyor...' : 'Kelime Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 