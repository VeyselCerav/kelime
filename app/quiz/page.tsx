'use client';

import { useState, useEffect } from 'react';
import { useWeek } from '../context/WeekContext';
import { useSearchParams } from 'next/navigation';
import Quiz from '../components/Quiz';
import { useSession } from 'next-auth/react';

interface Word {
  id: string;
  english: string;
  turkish: string;
  week: number;
}

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
  const { selectedWeek } = useWeek();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const url = new URL('/api/quiz', window.location.origin);
        if (selectedWeek) {
          url.searchParams.set('week', selectedWeek.toString());
        }
        url.searchParams.set('limit', '10');

        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Sorular yüklenirken bir hata oluştu');
        }
        const data = await response.json();
        setQuestions(data);
        setError('');
      } catch (error) {
        console.error('Quiz error:', error);
        setError(error instanceof Error ? error.message : 'Sorular yüklenirken bir hata oluştu');
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [selectedWeek]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-red-600 text-center">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="btn btn-primary"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600 text-center">
          {selectedWeek 
            ? `${selectedWeek}. haftaya ait soru bulunmuyor.`
            : 'Henüz soru bulunmuyor.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {selectedWeek ? `${selectedWeek}. Hafta Testi` : 'Test'}
      </h1>
      <Quiz questions={questions} isAuthenticated={!!session} />
    </div>
  );
} 