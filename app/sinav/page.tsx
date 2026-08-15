'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Quiz, { QuizQuestion, QuizResultSummary } from '../components/Quiz';

type Phase = 'loading' | 'setup' | 'exam' | 'error';

export default function ExamPage() {
  const { data: session, status } = useSession();
  const [phase, setPhase] = useState<Phase>('loading');
  const [learnedCount, setLearnedCount] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadMeta = useCallback(async () => {
    if (!session) return;
    setPhase('loading');
    setError('');
    try {
      // count=0 ile learnedCount öğren; 20 altıysa doğrudan soruları da alabiliriz
      const probe = await fetch('/api/exam/questions');
      const data = await probe.json();

      if (probe.status === 401) {
        setError('Sınav için giriş yapmalısın.');
        setPhase('error');
        return;
      }

      const count = data.learnedCount ?? 0;
      setLearnedCount(count);

      if (count === 0 || !data.canStart) {
        setError(data.error || 'Önce kelime ezberlemelisin.');
        setPhase('error');
        return;
      }

      if (count < 20) {
        const res = await fetch(`/api/exam/questions?count=${count}`);
        const exam = await res.json();
        if (!res.ok) {
          setError(exam.error || 'Sınav oluşturulamadı');
          setPhase('error');
          return;
        }
        setQuestions(exam.questions);
        setPhase('exam');
        return;
      }

      setPhase('setup');
    } catch {
      setError('Sınav bilgileri alınamadı');
      setPhase('error');
    }
  }, [session]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      setPhase('error');
      setError('Sınav için giriş yapmalısın.');
      return;
    }
    void loadMeta();
  }, [session, status, loadMeta]);

  const startExam = async (count: 20 | 40) => {
    setPhase('loading');
    setError('');
    setSaved(false);
    try {
      const res = await fetch(`/api/exam/questions?count=${count}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sınav oluşturulamadı');
        setPhase('setup');
        return;
      }
      setQuestions(data.questions);
      setLearnedCount(data.learnedCount ?? learnedCount);
      setPhase('exam');
    } catch {
      setError('Sınav başlatılamadı');
      setPhase('setup');
    }
  };

  const handleComplete = async (results: QuizResultSummary) => {
    if (saved || saving) return;
    setSaving(true);
    try {
      await fetch('/api/exam/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionCount: results.totalQuestions,
          correctCount: results.correctAnswers,
          wrongCount: results.wrongAnswers,
          score: Math.round(results.score * 10) / 10,
        }),
      });
      setSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell space-y-6 py-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-on-surface">Sınav</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Ezberlediğin kelimelerden sınava gir; sonuçlar profildeki İstatistikler’de görünür.
        </p>
      </div>

      {phase === 'loading' && (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {phase === 'error' && (
        <div className="rounded-card bg-cream p-6 text-center shadow-organic">
          <span className="material-symbols-outlined text-4xl text-secondary">
            assignment_late
          </span>
          <p className="mt-3 text-on-surface-variant">{error}</p>
          <div className="mt-5 flex flex-col gap-2">
            {!session ? (
              <Link
                href="/login"
                className="rounded-full bg-primary py-3 font-semibold text-on-primary"
              >
                Giriş Yap
              </Link>
            ) : (
              <Link
                href="/flashcards"
                className="rounded-full bg-primary py-3 font-semibold text-on-primary"
              >
                Kelime Ezberle
              </Link>
            )}
          </div>
        </div>
      )}

      {phase === 'setup' && (
        <div className="space-y-4">
          <div className="rounded-card border border-outline-variant/40 bg-cream p-5 shadow-organic">
            <p className="text-sm text-on-surface-variant">Ezberlediğin kelime</p>
            <p className="font-display text-4xl font-bold text-primary">{learnedCount}</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              20 veya 40 soruluk sınav seçebilirsin
              {learnedCount < 40 ? ' (en fazla ezberlediğin kadar).' : '.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => startExam(20)}
              className="btn-tactile rounded-card bg-primary-container p-6 text-left shadow-soft"
            >
              <span className="material-symbols-outlined text-on-primary-container">
                quiz
              </span>
              <h2 className="mt-3 font-display text-xl font-semibold text-on-primary-container">
                20 Soru
              </h2>
              <p className="text-sm text-on-primary-container/80">Kısa sınav</p>
            </button>
            <button
              type="button"
              onClick={() => startExam(40)}
              disabled={learnedCount < 20}
              className="btn-tactile rounded-card bg-secondary-container p-6 text-left shadow-soft disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-on-secondary-container">
                assignment
              </span>
              <h2 className="mt-3 font-display text-xl font-semibold text-on-secondary-container">
                40 Soru
              </h2>
              <p className="text-sm text-on-secondary-container/80">
                {learnedCount < 40
                  ? `${Math.min(40, learnedCount)} soruya kadar`
                  : 'Uzun sınav'}
              </p>
            </button>
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
      )}

      {phase === 'exam' && questions.length > 0 && (
        <div>
          {saving && (
            <p className="mb-3 text-center text-xs text-on-surface-variant">
              Sonuç kaydediliyor…
            </p>
          )}
          <Quiz
            questions={questions}
            isAuthenticated={!!session}
            examMode
            completedTitle="Sınav Tamamlandı"
            onComplete={handleComplete}
          />
        </div>
      )}
    </div>
  );
}
