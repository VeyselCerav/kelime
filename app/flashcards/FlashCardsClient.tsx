'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import WordCard from '../components/WordCard';
import StudyScopePicker from '../components/StudyScopePicker';
import ScopeProgressBar, {
  ScopeProgressView,
} from '../components/ScopeProgressBar';
import { useModule } from '../context/ModuleContext';
import { useBadgeContext } from '../context/BadgeContext';

interface Word {
  id: number;
  english: string;
  turkish: string;
  moduleId: number;
  isLearned?: boolean;
}

export default function FlashCardsClient() {
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [scope, setScope] = useState<ScopeProgressView | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const { data: session } = useSession();
  const { selectedModuleId, selectedGroup, selectedGroupIndex, unlearnedOnly } =
    useModule();
  const { refreshBadges } = useBadgeContext();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

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

  const refreshScope = useCallback(async () => {
    if (!selectedModuleId || !selectedGroupIndex || !session) return;
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
  }, [selectedModuleId, selectedGroupIndex, session]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    if (mode === 'practice') {
      const practiceWords = localStorage.getItem('practiceWords');
      if (practiceWords) setWords(JSON.parse(practiceWords));
      setIsLoading(false);
      return;
    }
    if (!selectedModuleId || !selectedGroupIndex) return;

    const fetchWords = async () => {
      setIsLoading(true);
      setError('');
      try {
        const unlearnedQs = unlearnedOnly ? '&unlearned=1' : '';
        const response = await fetch(
          `/api/words?moduleId=${selectedModuleId}&group=${selectedGroupIndex}&study=1${unlearnedQs}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Kelimeler alınamadı');
        }
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Geçersiz yanıt');
        setWords(data);
        setCurrentWordIndex(0);
        void refreshScope();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Hata');
      } finally {
        setIsLoading(false);
      }
    };
    fetchWords();
  }, [selectedModuleId, selectedGroupIndex, mode, refreshScope, unlearnedOnly]);

  const goNext = () => {
    setCurrentWordIndex((i) => (i + 1 < words.length ? i + 1 : 0));
  };

  const current = words[currentWordIndex];

  return (
    <div className="app-shell flex flex-col py-4">
      <div className="mb-4">
        <StudyScopePicker />
      </div>

      <div className="mb-4">
        <ScopeProgressBar progress={scope} showModule />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-on-surface">
          Kelime Kartları
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/favoriler"
            className="flex items-center gap-1 text-xs font-bold text-secondary"
          >
            <span className="material-symbols-outlined text-[18px]">star</span>
            Favorilerim
          </Link>
          {words.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-container-highest">
                <div
                  className="h-full bg-primary-container transition-all duration-500"
                  style={{
                    width: `${((currentWordIndex + 1) / words.length) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-on-surface-variant">
                {currentWordIndex + 1}/{words.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <p className="rounded-card bg-error/10 p-4 text-center text-error">{error}</p>
      ) : !current ? (
        <p className="rounded-card bg-cream p-6 text-center text-on-surface-variant">
          Bu grupta kelime yok.
        </p>
      ) : (
        <WordCard
          english={current.english}
          turkish={current.turkish}
          wordId={Number(current.id)}
          isAuthenticated={!!session}
          isFavorite={favoriteIds.has(Number(current.id))}
          onFavoriteChange={(id, favorited) => {
            setFavoriteIds((prev) => {
              const next = new Set(prev);
              if (favorited) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
          progressLabel={
            mode === 'practice'
              ? 'Tekrar · Ezberleyemediklerim'
              : unlearnedOnly
                ? `${selectedGroup?.label ?? ''} · Ezberleyemediklerim`
                : selectedGroup?.label
          }
          onActionComplete={goNext}
          onProgressSaved={() => {
            void refreshBadges();
            if (mode !== 'practice') void refreshScope();
          }}
          showPronounce
        />
      )}
    </div>
  );
}
