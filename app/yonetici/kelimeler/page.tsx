'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Word {
  id: string;
  word: string;
  meaning: string;
  example: string;
  addedBy: string;
  createdAt: string;
}

export default function WordsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [words, setWords] = useState<Word[]>([]);
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

    fetchWords();
  }, [session, status, router]);

  const fetchWords = async () => {
    try {
      const response = await fetch('/api/words');
      if (!response.ok) {
        throw new Error('Kelimeler alınırken bir hata oluştu');
      }
      const data = await response.json();
      setWords(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kelimeyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`/api/words/delete?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Kelime silinirken bir hata oluştu');
      }

      setWords(words.filter(word => word.id !== id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Bir hata oluştu');
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
        <h1 className="text-2xl font-bold">Kelime Listesi</h1>
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kelime
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Anlam
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Örnek
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ekleyen
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tarih
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {words.map((word) => (
              <tr key={word.id}>
                <td className="px-6 py-4 whitespace-nowrap">{word.word}</td>
                <td className="px-6 py-4 whitespace-nowrap">{word.meaning}</td>
                <td className="px-6 py-4 whitespace-nowrap">{word.example}</td>
                <td className="px-6 py-4 whitespace-nowrap">{word.addedBy}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(word.createdAt).toLocaleDateString('tr-TR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => handleDelete(word.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 