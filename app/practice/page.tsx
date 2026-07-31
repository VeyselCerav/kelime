'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useModule } from '../context/ModuleContext';
import Link from 'next/link';

interface Word {
  id: number;
  english: string;
  turkish: string;
  moduleId: number;
}

export default function Practice() {
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([]);
  const [wordCount, setWordCount] = useState(10);
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { modules } = useModule();
  const { data: session } = useSession();

  useEffect(() => {
    fetch('/api/words')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWords(data);
        else setError('Kelimeler yüklenemedi');
      })
      .catch(() => setError('Kelimeler yüklenirken bir hata oluştu'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (modules.length && selectedModuleIds.length === 0) {
      setSelectedModuleIds(modules.map((m) => m.id));
    }
  }, [modules, selectedModuleIds.length]);

  const toggleModule = (id: number) => {
    setSelectedModuleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getRandomWords = () => {
    const filtered = words.filter((w) => selectedModuleIds.includes(w.moduleId));
    return [...filtered].sort(() => Math.random() - 0.5).slice(0, wordCount);
  };

  const startFlashcards = () => {
    localStorage.setItem('practiceWords', JSON.stringify(getRandomWords()));
    window.location.href = '/flashcards?mode=practice';
  };

  const startQuiz = () => {
    localStorage.setItem('practiceWords', JSON.stringify(getRandomWords()));
    window.location.href = '/quiz?mode=practice';
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="app-shell space-y-6 py-6">
      <h1 className="font-display text-2xl font-bold text-on-surface">Tekrar Et</h1>
      {error && <p className="text-error">{error}</p>}

      <section className="rounded-card bg-cream p-5 shadow-organic">
        <h2 className="mb-3 font-semibold">Modüller</h2>
        <div className="space-y-2">
          {modules.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedModuleIds.includes(m.id)}
                onChange={() => toggleModule(m.id)}
                className="rounded border-outline-variant"
              />
              {m.name} ({m.wordCount})
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-card bg-cream p-5 shadow-organic">
        <label className="mb-2 block text-sm font-semibold">Kelime sayısı</label>
        <input
          type="number"
          min={1}
          value={wordCount}
          onChange={(e) => setWordCount(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full rounded-xl border border-outline-variant px-3 py-2"
        />
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={startFlashcards}
          className="rounded-full bg-secondary-container py-3 font-semibold text-on-secondary-container"
        >
          Kartlarla Tekrar
        </button>
        <button
          type="button"
          onClick={startQuiz}
          className="rounded-full bg-primary-container py-3 font-semibold text-on-primary-container"
        >
          Quiz ile Tekrar
        </button>
      </div>

      {!session && (
        <p className="text-center text-sm text-on-surface-variant">
          İlerleme kaydı için{' '}
          <Link href="/login" className="text-primary underline">
            giriş yap
          </Link>
        </p>
      )}
    </div>
  );
}
