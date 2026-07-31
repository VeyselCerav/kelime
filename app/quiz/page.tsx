'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Quiz from '../components/Quiz';
import StudyScopePicker from '../components/StudyScopePicker';
import { useModule } from '../context/ModuleContext';

interface Question {
  id: number;
  question: string;
  options: string[];
  answer: string;
  wordId: number;
}

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: session } = useSession();
  const { selectedModuleId, selectedGroup, selectedGroupIndex } = useModule();

  useEffect(() => {
    if (!selectedModuleId || !selectedGroupIndex) return;

    const fetchQuestions = async () => {
      setIsLoading(true);
      setError('');
      try {
        const url = new URL('/api/quiz', window.location.origin);
        url.searchParams.set('moduleId', selectedModuleId.toString());
        url.searchParams.set('group', selectedGroupIndex.toString());
        url.searchParams.set('limit', '20');

        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Sorular yüklenemedi');
        }
        const data = await response.json();
        setQuestions(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Hata');
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [selectedModuleId, selectedGroupIndex]);

  return (
    <div className="app-shell py-4">
      <div className="mb-6">
        <StudyScopePicker />
      </div>

      <h1 className="mb-2 font-display text-xl font-bold text-on-surface">Quiz</h1>
      {selectedGroup && (
        <p className="mb-6 text-sm text-on-surface-variant">
          {selectedGroup.label} · {selectedGroup.start}–{selectedGroup.end}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <p className="rounded-card bg-error/10 p-4 text-center text-error">{error}</p>
      ) : questions.length === 0 ? (
        <p className="rounded-card bg-cream p-6 text-center text-on-surface-variant">
          Bu grup için yeterli soru yok.
        </p>
      ) : (
        <Quiz questions={questions} isAuthenticated={!!session} />
      )}
    </div>
  );
}
