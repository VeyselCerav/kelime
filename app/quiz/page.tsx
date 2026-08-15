'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Quiz from '../components/Quiz';
import StudyScopePicker from '../components/StudyScopePicker';
import ScopeProgressBar, {
  ScopeProgressView,
} from '../components/ScopeProgressBar';
import { useModule } from '../context/ModuleContext';

interface Question {
  id: number;
  question: string;
  options: string[];
  answer: string;
  wordId: number;
}

interface PracticeWord {
  id: number;
  english: string;
  turkish: string;
}

function buildPracticeQuestions(words: PracticeWord[]): Question[] {
  const pool = words.length >= 4 ? words : words;
  return words.map((word) => {
    const others = pool.filter((w) => w.id !== word.id);
    const wrong = [...others]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((w) => w.turkish);
    while (wrong.length < 3 && others.length > wrong.length) {
      const extra = others.find((w) => !wrong.includes(w.turkish));
      if (!extra) break;
      wrong.push(extra.turkish);
    }
    const options = [...wrong.slice(0, 3), word.turkish].sort(
      () => Math.random() - 0.5
    );
    return {
      id: word.id,
      question: `"${word.english}" kelimesinin Türkçe anlamı nedir?`,
      options,
      answer: word.turkish,
      wordId: word.id,
    };
  });
}

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [scope, setScope] = useState<ScopeProgressView | null>(null);
  const [practiceTitle, setPracticeTitle] = useState<string | null>(null);
  const { data: session } = useSession();
  const { selectedModuleId, selectedGroup, selectedGroupIndex, unlearnedOnly } = useModule();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  const refreshScope = useCallback(async () => {
    if (!selectedModuleId || !selectedGroupIndex || !session || mode === 'practice')
      return;
    try {
      const res = await fetch(
        `/api/progress/scope?moduleId=${selectedModuleId}&group=${selectedGroupIndex}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setScope({
        learned: data.learned,
        total: data.total,
        percentage: data.percentage,
        label: data.label,
        moduleLearned: data.moduleLearned,
        moduleTotal: data.moduleTotal,
        complete: data.complete,
      });
    } catch {
      /* ignore */
    }
  }, [selectedModuleId, selectedGroupIndex, session, mode]);

  useEffect(() => {
    if (mode === 'practice') {
      setIsLoading(true);
      try {
        const raw = localStorage.getItem('practiceWords');
        const metaRaw = localStorage.getItem('practiceMeta');
        const words: PracticeWord[] = raw ? JSON.parse(raw) : [];
        if (metaRaw) {
          const meta = JSON.parse(metaRaw);
          setPracticeTitle(
            meta.moduleName
              ? `${meta.moduleName} · Ezberleyemediklerim`
              : 'Tekrar quiz'
          );
        } else {
          setPracticeTitle('Tekrar quiz');
        }
        if (words.length < 4) {
          setError('Quiz için en az 4 kelime gerekli.');
          setQuestions([]);
        } else {
          setQuestions(buildPracticeQuestions(words));
          setError('');
        }
      } catch {
        setError('Tekrar listesi okunamadı');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!selectedModuleId || !selectedGroupIndex) return;

    const fetchQuestions = async () => {
      setIsLoading(true);
      setError('');
      setPracticeTitle(null);
      try {
        const url = new URL('/api/quiz', window.location.origin);
        url.searchParams.set('moduleId', selectedModuleId.toString());
        url.searchParams.set('group', selectedGroupIndex.toString());
        url.searchParams.set('limit', '20');
        if (unlearnedOnly) url.searchParams.set('unlearned', '1');

        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Sorular yüklenemedi');
        }
        const data = await response.json();
        setQuestions(data);
        void refreshScope();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Hata');
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [selectedModuleId, selectedGroupIndex, refreshScope, mode, unlearnedOnly]);

  return (
    <div className="app-shell py-4">
      {mode !== 'practice' && (
        <>
          <div className="mb-6">
            <StudyScopePicker />
          </div>
          <div className="mb-4">
            <ScopeProgressBar progress={scope} showModule />
          </div>
        </>
      )}

      <h1 className="mb-2 font-display text-xl font-bold text-on-surface">
        {practiceTitle || 'Quiz'}
      </h1>
      {mode !== 'practice' && selectedGroup && (
        <p className="mb-6 text-sm text-on-surface-variant">
          {selectedGroup.label}
          {unlearnedOnly ? ' · Ezberleyemediklerim' : ''} · {selectedGroup.start}–
          {selectedGroup.end}
        </p>
      )}
      {mode === 'practice' && (
        <p className="mb-6 text-sm text-on-surface-variant">
          Ezberlediğin kelimeler hesabından silinmez; sadece tekrar listesinden
          düşer.
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
