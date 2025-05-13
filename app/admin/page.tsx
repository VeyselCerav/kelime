'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWeek } from '../context/WeekContext';

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
  const { refreshWeeks } = useWeek();

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth');
      if (!response.ok) throw new Error('Auth check failed');
      const data = await response.json();

      if (!data.isLoggedIn) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Yetkilendirme kontrolü yapılırken hata oluştu:', error);
      router.push('/login');
    }
  }, [router]);

  const fetchWords = useCallback(async () => {
    try {
      const response = await fetch('/api/words');
      if (!response.ok) throw new Error('Failed to fetch words');
      const data = await response.json();
      setWords(data);
    } catch (error) {
      console.error('Kelimeler yüklenirken hata oluştu:', error);
      setMessage('Kelimeler yüklenirken hata oluştu');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    fetchWords();
  }, [checkAuth, fetchWords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Kelime eklenirken bir hata oluştu');
      }

      await response.json();
      setMessage('Kelime başarıyla eklendi!');
      setIsError(false);
      setFormData({ english: '', turkish: '', week: '' });
      await fetchWords();
      await refreshWeeks();
    } catch (error) {
      console.error('Add word error:', error);
      setMessage('Kelime eklenirken bir hata oluştu');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu kelimeyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/words/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Kelime silinirken bir hata oluştu');
      }

      setMessage('Kelime başarıyla silindi!');
      setIsError(false);
      await fetchWords();
      await refreshWeeks();
    } catch (error) {
      console.error('Delete word error:', error);
      setMessage('Kelime silinirken bir hata oluştu');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8">
        Kelime Yönetimi
      </h1>

      <div className="card bg-white border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all rounded-2xl mb-8">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4 text-base-content">Yeni Kelime Ekle</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">
                  <span className="label-text text-base-content/70">İngilizce</span>
                </label>
                <input
                  type="text"
                  name="english"
                  value={formData.english}
                  onChange={handleChange}
                  className="input bg-white border-2 border-base-300 focus:border-primary/30 w-full rounded-xl"
                  required
                />
              </div>
              
              <div>
                <label className="label">
                  <span className="label-text text-base-content/70">Türkçe</span>
                </label>
                <input
                  type="text"
                  name="turkish"
                  value={formData.turkish}
                  onChange={handleChange}
                  className="input bg-white border-2 border-base-300 focus:border-primary/30 w-full rounded-xl"
                  required
                />
              </div>
              
              <div>
                <label className="label">
                  <span className="label-text text-base-content/70">Hafta</span>
                </label>
                <input
                  type="number"
                  name="week"
                  value={formData.week}
                  onChange={handleChange}
                  className="input bg-white border-2 border-base-300 focus:border-primary/30 w-full rounded-xl"
                  required
                  min="1"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit" 
                className="btn bg-white text-primary hover:bg-primary/5 border-2 border-primary/20 rounded-xl px-8 hover:shadow-lg transition-all"
                disabled={isLoading}
              >
                {isLoading ? 'Ekleniyor...' : 'Kelime Ekle'}
              </button>
            </div>
          </form>

          {message && (
            <div className={`alert ${isError ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'} mt-4 border-2 rounded-xl`}>
              {message}
            </div>
          )}
        </div>
      </div>

      <div className="card bg-white border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all rounded-2xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4 text-base-content">Kelime Listesi</h2>
          
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="text-base-content/70">
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
                        className="btn btn-sm bg-white text-red-500 hover:bg-red-50 border-2 border-red-200 rounded-xl"
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
    </div>
  );
} 