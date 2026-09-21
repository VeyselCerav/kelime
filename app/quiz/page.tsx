'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Quiz from '../components/Quiz';
import IrregularVerbCard from '../components/IrregularVerbCard';
import StudyScopePicker from '../components/StudyScopePicker';
import { useModule } from '../context/ModuleContext';
import { useBadgeContext } from '../context/BadgeContext';
import { getLockedScrollY, pinWindowScroll } from '@/lib/scroll-lock';
import { IRREGULAR_VERBS_SLUG } from '@/lib/irregular-verbs';
import { isTenseAnahtarSlug } from '@/lib/tense-quiz';
import { isOdevSlug } from '@/lib/odev';
import TenseQuizMode from '../components/TenseQuizMode';

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

interface IrregularWord {
  id: number;
  english: string;
  pastSimple: string;
  pastParticiple: string;
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
  const [irregularWords, setIrregularWords] = useState<IrregularWord[]>([]);
  const [irregularIndex, setIrregularIndex] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [practiceTitle, setPracticeTitle] = useState<string | null>(null);
  const { data: session } = useSession();
  const {
    selectedModuleId,
    selectedModule,
    selectedGroup,
    selectedGroupIndex,
    unlearnedOnly,
  } = useModule();
  const { refreshBadges } = useBadgeContext();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const pinYRef = useRef<number | null>(null);

  const isIrregular =
    mode !== 'practice' && selectedModule?.slug === IRREGULAR_VERBS_SLUG;
  const isTense =
    mode !== 'practice' && isTenseAnahtarSlug(selectedModule?.slug);

  const loadFavorites = useCallback(async () => {
    if (!session) {
      setFavoriteIds(new Set());
      return;
    }
    try {
      const res = await fetch('/api/favorites', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      setFavoriteIds(new Set(Array.isArray(data.wordIds) ? data.wordIds : []));
    } catch {
      /* ignore */
    }
  }, [session]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    if (mode === 'practice') {
      setIsLoading(true);
      setIrregularWords([]);
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

    if (isTenseAnahtarSlug(selectedModule?.slug)) {
      setIsLoading(false);
      setError('');
      setPracticeTitle(null);
      setQuestions([]);
      setIrregularWords([]);
      return;
    }

    if (!selectedModuleId || !selectedGroupIndex) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      setPracticeTitle(null);
      setQuestions([]);
      setIrregularWords([]);
      setIrregularIndex(0);
      try {
        if (selectedModule?.slug === IRREGULAR_VERBS_SLUG) {
          const unlearnedQs = unlearnedOnly ? '&unlearned=1' : '';
          const response = await fetch(
            `/api/words?moduleId=${selectedModuleId}&group=${selectedGroupIndex}&study=1${unlearnedQs}`
          );
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fiiller yüklenemedi');
          }
          const data = await response.json();
          if (!Array.isArray(data)) throw new Error('Geçersiz yanıt');
          const list: IrregularWord[] = data
            .filter(
              (w: {
                pastSimple?: string | null;
                pastParticiple?: string | null;
              }) => w.pastSimple && w.pastParticiple
            )
            .map(
              (w: {
                id: number;
                english: string;
                pastSimple: string;
                pastParticiple: string;
              }) => ({
                id: Number(w.id),
                english: w.english,
                pastSimple: w.pastSimple,
                pastParticiple: w.pastParticiple,
              })
            );
          setIrregularWords(list);
        } else {
          const url = new URL('/api/quiz', window.location.origin);
          url.searchParams.set('moduleId', selectedModuleId.toString());
          url.searchParams.set('group', selectedGroupIndex.toString());
          url.searchParams.set(
            'limit',
            isOdevSlug(selectedModule?.slug) ? '25' : '20'
          );
          if (unlearnedOnly) url.searchParams.set('unlearned', '1');

          const response = await fetch(url);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Sorular yüklenemedi');
          }
          const data = await response.json();
          setQuestions(data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Hata');
        setQuestions([]);
        setIrregularWords([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [
    selectedModuleId,
    selectedModule?.slug,
    selectedGroupIndex,
    mode,
    unlearnedOnly,
  ]);

  const goNextIrregular = () => {
    pinYRef.current =
      getLockedScrollY() ??
      (typeof window !== 'undefined' ? window.scrollY : 0);
    setIrregularIndex((i) =>
      i + 1 < irregularWords.length ? i + 1 : 0
    );
  };

  useLayoutEffect(() => {
    if (pinYRef.current == null) return;
    pinWindowScroll(pinYRef.current);
    const y = pinYRef.current;
    const t = window.setTimeout(() => pinWindowScroll(y), 50);
    return () => window.clearTimeout(t);
  }, [irregularIndex]);

  const currentIrregular = irregularWords[irregularIndex];

  return (
    <div className="app-shell py-4">
      {mode !== 'practice' && !isTense && (
        <div className="mb-6">
          <StudyScopePicker />
        </div>
      )}

      <h1 className="mb-2 font-display text-xl font-bold text-on-surface">
        {practiceTitle ||
          (isIrregular
            ? 'Irregular Verbs · Yazmalı'
            : isTense
              ? 'Tense Quiz'
              : 'Quiz')}
      </h1>
      {mode !== 'practice' && !isTense && selectedGroup && (
        <p className="mb-6 text-sm text-on-surface-variant">
          {selectedGroup.label}
          {unlearnedOnly ? ' · Ezberleyemediklerim' : ''} · {selectedGroup.start}–
          {selectedGroup.end}
          {isIrregular ? ' · V2 / V3 yaz' : ''}
        </p>
      )}
      {isTense && (
        <p className="mb-6 text-sm text-on-surface-variant">
          Zorluk seç; tüm tense’lerden karışık cloze soruları çöz.
        </p>
      )}
      {mode === 'practice' && (
        <p className="mb-6 text-sm text-on-surface-variant">
          Ezberlediğin kelimeler hesabından silinmez; sadece tekrar listesinden
          düşer.
        </p>
      )}

      {isTense ? (
        <TenseQuizMode isAuthenticated={!!session} />
      ) : isLoading ? (
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <p className="rounded-card bg-error/10 p-4 text-center text-error">{error}</p>
      ) : isIrregular ? (
        !currentIrregular ? (
          <p className="rounded-card bg-cream p-6 text-center text-on-surface-variant">
            Bu grupta fiil yok.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <span className="text-xs font-bold text-on-surface-variant">
                {irregularIndex + 1}/{irregularWords.length}
              </span>
            </div>
            <IrregularVerbCard
              wordId={currentIrregular.id}
              infinitive={currentIrregular.english}
              pastSimple={currentIrregular.pastSimple}
              pastParticiple={currentIrregular.pastParticiple}
              isAuthenticated={!!session}
              isFavorite={favoriteIds.has(currentIrregular.id)}
              onFavoriteChange={(id, favorited) => {
                setFavoriteIds((prev) => {
                  const next = new Set(prev);
                  if (favorited) next.add(id);
                  else next.delete(id);
                  return next;
                });
              }}
              progressLabel={
                unlearnedOnly
                  ? `${selectedGroup?.label ?? ''} · Ezberleyemediklerim`
                  : selectedGroup?.label
              }
              onActionComplete={goNextIrregular}
              onProgressSaved={() => void refreshBadges()}
            />
          </div>
        )
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
