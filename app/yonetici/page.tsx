'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Word {
  id: number;
  english: string;
  turkish: string;
  week: number;
  createdAt: string;
}

export default function Admin() {
  const [words, setWords] = useState<Word[]>([]);
  const [formData, setFormData] = useState({
    english: '',
    turkish: '',
    week: ''
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    const init = async () => {
      try {
        if (status === "loading") return;

        if (!session) {
          router.replace('/login');
          return;
        }

        if (!session.user?.isAdmin) {
          router.replace('/');
          return;
        }

        const response = await fetch('/api/words');
        if (!response.ok) throw new Error('Failed to fetch words');
        const data = await response.json();
        setWords(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Initialization error:', error);
        setMessage('Bir hata oluştu');
        setIsError(true);
        setIsLoading(false);
      }
    };

    init();
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/words/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kelime eklenirken bir hata oluştu');
      }

      await response.json();
      setMessage('Kelime başarıyla eklendi!');
      setIsError(false);
      setFormData({ english: '', turkish: '', week: '' });

      // Kelimeleri yeniden yükle
      const wordsResponse = await fetch('/api/words');
      if (!wordsResponse.ok) throw new Error('Failed to fetch words');
      const wordsData = await wordsResponse.json();
      setWords(wordsData);
    } catch (error) {
      console.error('Add word error:', error);
      setMessage(error instanceof Error ? error.message : 'Kelime eklenirken bir hata oluştu');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu kelimeyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/words/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wordId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kelime silinirken bir hata oluştu');
      }

      setMessage('Kelime başarıyla silindi!');
      setIsError(false);
      setWords(words.filter(word => word.id !== id));
    } catch (error) {
      console.error('Delete word error:', error);
      setMessage(error instanceof Error ? error.message : 'Kelime silinirken bir hata oluştu');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8">Kelime Yönetimi</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Yeni Kelime Ekle</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              name="english"
              value={formData.english}
              onChange={(e) => setFormData({...formData, english: e.target.value})}
              placeholder="İngilizce"
              className="input input-bordered w-full"
              required
            />
            
            <input
              type="text"
              name="turkish"
              value={formData.turkish}
              onChange={(e) => setFormData({...formData, turkish: e.target.value})}
              placeholder="Türkçe"
              className="input input-bordered w-full"
              required
            />
            
            <input
              type="number"
              name="week"
              value={formData.week}
              onChange={(e) => setFormData({...formData, week: e.target.value})}
              placeholder="Hafta"
              className="input input-bordered w-full"
              required
              min="1"
            />
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Ekleniyor...' : 'Kelime Ekle'}
            </button>
          </div>
        </form>

        {message && (
          <div className={`mt-4 p-4 rounded-lg ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Kelime Listesi</h2>
        
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>İngilizce</th>
                <th>Türkçe</th>
                <th>Hafta</th>
                <th>Eklenme Tarihi</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word) => (
                <tr key={word.id}>
                  <td>{word.english}</td>
                  <td>{word.turkish}</td>
                  <td>{word.week}</td>
                  <td>{new Date(word.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(word.id)}
                      className="btn btn-sm btn-error"
                      disabled={isLoading}
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
    </div>
  );
} 