'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UnlearnedQuiz from '../components/UnlearnedQuiz';

interface Word {
  id: number;
  english: string;
  turkish: string;
}

interface UnlearnedWord {
  id: number;
  word: Word;
}

export default function UnlearnedWordsPage() {
  const [unlearnedWords, setUnlearnedWords] = useState<UnlearnedWord[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'cards' | 'quiz'>('cards');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
        });
        setIsAuthenticated(response.ok);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
    fetchUnlearnedWords();
  }, []);

  const fetchUnlearnedWords = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/unlearned-words', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kelimeler getirilirken bir hata oluştu');
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Geçersiz veri formatı');
      }
      
      setUnlearnedWords(data);
    } catch (error) {
      console.error('Ezberlenemeyen kelimeler yükleme hatası:', error);
      setError(error instanceof Error ? error.message : 'Kelimeler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromUnlearned = async (wordId: number) => {
    try {
      const response = await fetch('/api/unlearned-words', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wordId }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Kelime kaldırılırken bir hata oluştu');
      }

      setUnlearnedWords(prev => prev.filter(uw => uw.word.id !== wordId));
    } catch (error) {
      setError('Kelime kaldırılırken bir hata oluştu');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (unlearnedWords.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">
          Ezberleyemediğiniz kelime bulunmuyor.
        </div>
      </div>
    );
  }

  if (unlearnedWords.length < 4 && mode === 'quiz') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">
          Test modu için en az 4 kelime gerekiyor.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Ezberleyemediklerim
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setMode('cards')}
            className={`px-4 py-2 rounded-md ${
              mode === 'cards'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Kelime Kartları
          </button>
          <button
            onClick={() => setMode('quiz')}
            className={`px-4 py-2 rounded-md ${
              mode === 'quiz'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Test
          </button>
        </div>
      </div>

      {mode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {unlearnedWords.map(({ word }) => (
            <div
              key={word.id}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {word.english}
              </h3>
              <p className="text-gray-600 mb-4">{word.turkish}</p>
              <button
                onClick={() => removeFromUnlearned(word.id)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                Öğrendim
              </button>
            </div>
          ))}
        </div>
      ) : (
        <UnlearnedQuiz
          unlearnedWords={unlearnedWords}
          onRemoveWord={removeFromUnlearned}
          isAuthenticated={isAuthenticated}
        />
      )}
    </div>
  );
} 