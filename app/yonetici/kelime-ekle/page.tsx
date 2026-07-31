'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ModuleOption {
  id: number;
  name: string;
  slug: string;
}

export default function AddWordPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [formData, setFormData] = useState({
    english: '',
    turkish: '',
    moduleId: '',
  });

  useEffect(() => {
    fetch('/api/modules')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setModules(data);
          if (data[0]) {
            setFormData((f) => ({ ...f, moduleId: String(data[0].id) }));
          }
        }
      })
      .catch(console.error);
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Yükleniyor...</div>
      </div>
    );
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          english: formData.english,
          turkish: formData.turkish,
          moduleId: formData.moduleId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Kelime eklenirken bir hata oluştu');
      }

      router.push('/yonetici/kelimeler');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Yeni Kelime Ekle</h1>
          <button
            onClick={() => router.push('/yonetici')}
            className="rounded bg-gray-500 px-4 py-2 text-white transition hover:bg-gray-600"
          >
            Geri Dön
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-100 p-4 text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
          <div>
            <label htmlFor="english" className="block text-sm font-medium text-gray-700">
              İngilizce Kelime
            </label>
            <input
              type="text"
              id="english"
              value={formData.english}
              onChange={(e) => setFormData({ ...formData, english: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="moduleId" className="block text-sm font-medium text-gray-700">
              Modül
            </label>
            <select
              id="moduleId"
              value={formData.moduleId}
              onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
              required
            >
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="rounded bg-primary px-4 py-2 text-white transition disabled:opacity-50"
            >
              {isLoading ? 'Ekleniyor...' : 'Kelime Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
