'use client';

import { useEffect, useRef, useState } from 'react';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answer: string;
  wordId: number;
  /** Yanlışta favoriye eklenecek ek kelime id’leri (tense anahtar grubu) */
  relatedWordIds?: number[];
  hint?: string | null;
  explanation?: string | null;
}

export interface QuizResultSummary {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
}

interface QuizProps {
  questions: QuizQuestion[];
  isAuthenticated?: boolean;
  /** Sınav modunda öğrenme kaydı güncellenmez */
  examMode?: boolean;
  /** Yanlış cevapta wordId (+ relatedWordIds) favoriye eklenir */
  autoFavoriteWrong?: boolean;
  completedTitle?: string;
  onComplete?: (results: QuizResultSummary) => void;
  hideCompleteScreen?: boolean;
}

export default function Quiz({
  questions,
  isAuthenticated,
  examMode = false,
  autoFavoriteWrong = false,
  completedTitle = 'Quiz Tamamlandı',
  onComplete,
  hideCompleteScreen = false,
}: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [error, setError] = useState('');
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [favoriting, setFavoriting] = useState(false);
  const [autoFavoritedCount, setAutoFavoritedCount] = useState(0);
  const [results, setResults] = useState<QuizResultSummary>({
    totalQuestions: questions.length,
    correctAnswers: 0,
    wrongAnswers: 0,
    score: 0,
  });
  const savedRef = useRef(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isFavorite = currentQuestion
    ? favoriteIds.has(currentQuestion.wordId)
    : false;
  const progressPct =
    ((currentQuestionIndex + (isAnswered ? 1 : 0)) / questions.length) * 100;

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setQuizCompleted(false);
    savedRef.current = false;
    setAutoFavoritedCount(0);
    setResults({
      totalQuestions: questions.length,
      correctAnswers: 0,
      wrongAnswers: 0,
      score: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length, questions.map((q) => q.id).join(',')]);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/favorites', {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const ids = Array.isArray(data.wordIds)
          ? data.wordIds.map((id: unknown) => Number(id))
          : [];
        setFavoriteIds(new Set(ids.filter((id: number) => !Number.isNaN(id))));
      } catch {
        /* sessiz */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, questions.length, questions[0]?.wordId]);

  const toggleFavorite = async () => {
    if (!currentQuestion) return;
    if (!isAuthenticated) {
      setError('Favori için oturum açmanız gerekiyor');
      return;
    }
    if (favoriting) return;
    if (!currentQuestion.wordId) return;
    setFavoriting(true);
    setError('');
    const wordId = currentQuestion.wordId;
    const next = !favoriteIds.has(wordId);
    try {
      const res = await fetch('/api/favorites', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Favori güncellenemedi');
      }
      setFavoriteIds((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(wordId);
        else copy.delete(wordId);
        return copy;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata oluştu');
    } finally {
      setFavoriting(false);
    }
  };

  const handleAnswerSelect = async (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);

    const isCorrect = answer === currentQuestion.answer;
    setResults((prev) => ({
      ...prev,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      wrongAnswers: !isCorrect ? prev.wrongAnswers + 1 : prev.wrongAnswers,
      score: isCorrect ? prev.score + 100 / questions.length : prev.score,
    }));

    if (!isAuthenticated) return;

    if (!isCorrect && autoFavoriteWrong) {
      const ids = [
        ...(currentQuestion.relatedWordIds?.length
          ? currentQuestion.relatedWordIds
          : currentQuestion.wordId
            ? [currentQuestion.wordId]
            : []),
      ]
        .filter((id) => id > 0)
        .slice(0, 5);
      // Sonraki soruyu kilitlemesin diye arka planda ekle
      void Promise.all(
        ids.map(async (wordId) => {
          try {
            const res = await fetch('/api/favorites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ wordId }),
              credentials: 'include',
            });
            if (res.ok) {
              setFavoriteIds((prev) => new Set(prev).add(wordId));
              setAutoFavoritedCount((n) => n + 1);
            }
          } catch {
            /* sessiz */
          }
        })
      );
    }

    if (examMode || autoFavoriteWrong) return;

    try {
      await fetch('/api/learned-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId: currentQuestion.wordId,
          isLearned: isCorrect,
        }),
        credentials: 'include',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    }
  };

  const finishWith = (finalResults: QuizResultSummary) => {
    setQuizCompleted(true);
    if (!savedRef.current) {
      savedRef.current = true;
      onComplete?.(finalResults);
    }
  };

  const handleNext = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      setResults((prev) => {
        finishWith(prev);
        return prev;
      });
      return;
    }
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCurrentQuestionIndex(nextIndex);
  };

  const handleRestartQuiz = () => {
    savedRef.current = false;
    setAutoFavoritedCount(0);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setQuizCompleted(false);
    setResults({
      totalQuestions: questions.length,
      correctAnswers: 0,
      wrongAnswers: 0,
      score: 0,
    });
  };

  if (quizCompleted) {
    if (hideCompleteScreen) {
      return (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-md space-y-6 rounded-card bg-cream p-6 text-center shadow-organic">
        <span className="material-symbols-outlined text-5xl text-primary">
          emoji_events
        </span>
        <h2 className="font-display text-2xl font-bold text-on-surface">
          {completedTitle}
        </h2>
        <p className="text-on-surface-variant">
          {results.correctAnswers}/{results.totalQuestions} doğru ·{' '}
          {Math.round(results.score)}%
        </p>
        {autoFavoritedCount > 0 && (
          <p className="text-sm text-secondary">
            {autoFavoritedCount} anahtar kelime favorilere eklendi.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {!examMode && (
            <button
              type="button"
              onClick={handleRestartQuiz}
              className="w-full rounded-full bg-primary py-3 font-semibold text-on-primary shadow-lg active:scale-95"
            >
              Tekrar Çöz
            </button>
          )}
          {examMode && (
            <a
              href="/stats"
              className="w-full rounded-full bg-primary py-3 font-semibold text-on-primary shadow-lg"
            >
              Sonuçları İstatistikte Gör
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[600px] flex-col">
      <div className="relative mb-8 flex h-12 w-full items-center">
        <div className="relative h-1 w-full rounded-full bg-outline-variant">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="absolute top-8 left-0 right-0 flex justify-between text-[11px] font-bold text-outline">
          <span>Başlangıç</span>
          <span>
            Soru {currentQuestionIndex + 1}/{questions.length}
          </span>
          <span>Hedef</span>
        </div>
      </div>

      <p className="mb-4 text-center text-sm italic text-secondary">
        {examMode
          ? 'Yarış — hızlı ve doğru ol!'
          : autoFavoriteWrong
            ? 'Anahtar kelimeye göre doğru tense’i seç'
            : 'Harika gidiyorsun, devam et!'}
      </p>

      <section className="paper-stack paper-texture relative mb-6 rounded-[32px] border border-outline-variant/60 p-6 shadow-soft">
        <div className="mb-3 flex items-start justify-between">
          <span className="rounded-full bg-tertiary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-tertiary">
            {examMode ? 'Yarış' : autoFavoriteWrong ? 'Tense' : 'Anlam'}
          </span>
          {currentQuestion?.wordId > 0 && (
            <button
              type="button"
              disabled={favoriting || !currentQuestion}
              aria-label={isFavorite ? 'Favoriden çıkar' : 'Favoriye ekle'}
              onClick={() => void toggleFavorite()}
              className={`btn-tactile -mr-1 -mt-1 flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-50 ${
                isFavorite ? 'text-secondary' : 'text-on-surface-variant'
              }`}
            >
              <span
                className="material-symbols-outlined text-[28px]"
                style={
                  isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined
                }
              >
                star
              </span>
            </button>
          )}
        </div>
        <h2 className="mb-2 font-display text-[22px] font-bold leading-tight text-on-surface sm:text-[28px]">
          {currentQuestion.question}
        </h2>
        {isAnswered &&
          (currentQuestion.hint || currentQuestion.explanation) && (
            <div className="mt-4 space-y-1 rounded-[16px] bg-surface-container-low p-3 text-sm text-on-surface-variant">
              {currentQuestion.hint && (
                <p>
                  <span className="font-semibold text-on-surface">İpucu: </span>
                  {currentQuestion.hint}
                </p>
              )}
              {currentQuestion.explanation && (
                <p>
                  <span className="font-semibold text-on-surface">
                    Açıklama:{' '}
                  </span>
                  {currentQuestion.explanation}
                </p>
              )}
            </div>
          )}
      </section>

      <div className="grid grid-cols-1 gap-3">
        {currentQuestion.options.map((option) => {
          const selected = selectedAnswer === option;
          const correct = isAnswered && option === currentQuestion.answer;
          const wrong =
            isAnswered && selected && option !== currentQuestion.answer;
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleAnswerSelect(option)}
              className={`btn-tactile flex w-full items-center justify-between rounded-[20px] border p-5 text-left transition ${
                correct
                  ? 'border-2 border-primary-container bg-primary-container/10'
                  : wrong
                    ? 'border-2 border-error bg-error/5'
                    : selected
                      ? 'border-2 border-primary-container bg-primary-container/10'
                      : 'border-outline-variant bg-surface-container-low hover:border-primary-container'
              }`}
            >
              <span
                className={`text-lg ${
                  correct || selected
                    ? 'font-medium text-primary'
                    : 'text-on-surface'
                }`}
              >
                {option}
              </span>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                  correct
                    ? 'border-primary bg-primary'
                    : wrong
                      ? 'border-error bg-error'
                      : 'border-outline-variant'
                }`}
              >
                {(correct || (selected && isAnswered)) && (
                  <span
                    className="material-symbols-outlined text-[16px] text-white"
                    style={{ fontVariationSettings: "'wght' 700" }}
                  >
                    {correct ? 'check' : 'close'}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <button
          type="button"
          disabled={!isAnswered}
          onClick={handleNext}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold text-on-primary shadow-lg transition active:scale-95 disabled:opacity-40"
        >
          {currentQuestionIndex + 1 >= questions.length
            ? 'Sonuçları Gör'
            : 'Sonraki Soru'}
          <span className="material-symbols-outlined">trending_flat</span>
        </button>
      </div>

      {error && <p className="mt-3 text-center text-sm text-error">{error}</p>}
    </div>
  );
}
