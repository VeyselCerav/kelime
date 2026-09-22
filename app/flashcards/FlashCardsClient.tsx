'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import WordCard from '../components/WordCard';
import StudyScopePicker from '../components/StudyScopePicker';
import { useModule } from '../context/ModuleContext';
import { useBadgeContext } from '../context/BadgeContext';
import { getLockedScrollY, pinWindowScroll } from '@/lib/scroll-lock';
import { IRREGULAR_VERBS_SLUG } from '@/lib/irregular-verbs';
import { isOdevSlug } from '@/lib/odev';
import OdevPushPrompt from '../components/OdevPushPrompt';
import {
  isTenseAnahtarSlug,
  isTenseGrammarWord,
  tenseRuleForCategory,
} from '@/lib/tense-quiz';

interface Word {
  id: number;
  english: string;
  turkish: string;
  moduleId: number;
  category?: string | null;
  addedBy?: string | null;
  isLearned?: boolean;
  imageUrl?: string | null;
  pastSimple?: string | null;
  pastParticiple?: string | null;
}

export default function FlashCardsClient() {
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  /** Ödev: her oturumda varsayılan açık (localStorage yok) */
  const [odevImagesOn, setOdevImagesOn] = useState(true);
  const { data: session } = useSession();
  const { selectedModuleId, selectedModule, selectedGroup, selectedGroupIndex, unlearnedOnly } =
    useModule();
  const { refreshBadges } = useBadgeContext();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const pinYRef = useRef<number | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, []);

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
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Hata');
      } finally {
        setIsLoading(false);
      }
    };
    fetchWords();
  }, [selectedModuleId, selectedGroupIndex, mode, unlearnedOnly]);

  const goNext = () => {
    pinYRef.current =
      getLockedScrollY() ??
      (typeof window !== 'undefined' ? window.scrollY : 0);
    setCurrentWordIndex((i) => (i + 1 < words.length ? i + 1 : 0));
  };

  useLayoutEffect(() => {
    if (pinYRef.current == null) return;
    pinWindowScroll(pinYRef.current);
    const y = pinYRef.current;
    const t = window.setTimeout(() => pinWindowScroll(y), 50);
    return () => window.clearTimeout(t);
  }, [currentWordIndex]);

  const scheduleProgressRefresh = () => {
    if (mode === 'practice') return;
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    // Chip yeniden çizimi Android’de sayfayı zıplatıyor; kaydırmalar bitsin
    progressTimerRef.current = setTimeout(() => {
      window.dispatchEvent(new Event('yds-scope-progress'));
    }, 2500);
  };

  const current = words[currentWordIndex];
  const isTenseRule =
    isTenseAnahtarSlug(selectedModule?.slug) &&
    isTenseGrammarWord(current?.addedBy);
  const tenseRule = isTenseRule
    ? tenseRuleForCategory(current?.category) ||
      (current?.category
        ? {
            formula: '',
            example: current.english,
            exampleTr: current.turkish,
          }
        : null)
    : null;

  return (
    <div className="app-shell flex flex-col overflow-anchor-none py-4 [overflow-anchor:none]">
      <div className="mb-4 [overflow-anchor:none]">
        <StudyScopePicker />
      </div>

      <OdevPushPrompt />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-on-surface">
          {selectedModule?.slug === IRREGULAR_VERBS_SLUG
            ? 'Irregular Verbs'
            : isOdevSlug(selectedModule?.slug)
              ? 'Ödev Kartları'
              : 'Kelime Kartları'}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {isOdevSlug(selectedModule?.slug) && (
            <Link
              href="/odev-antrenman"
              className="flex items-center gap-1 rounded-full bg-secondary/15 px-3 py-1.5 text-xs font-bold text-secondary"
            >
              <span className="material-symbols-outlined text-[16px]">
                fitness_center
              </span>
              Antrenman
            </Link>
          )}
          {isOdevSlug(selectedModule?.slug) && (
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-on-surface-variant">
              <span>Görseller</span>
              <button
                type="button"
                role="switch"
                aria-checked={odevImagesOn}
                onClick={() => setOdevImagesOn((v) => !v)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  odevImagesOn ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    odevImagesOn ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>
          )}
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
          imageUrl={current.imageUrl}
          moduleSlug={selectedModule?.slug}
          showCardImage={
            !isOdevSlug(selectedModule?.slug) || odevImagesOn
          }
          pastSimple={
            selectedModule?.slug === IRREGULAR_VERBS_SLUG
              ? current.pastSimple
              : null
          }
          pastParticiple={
            selectedModule?.slug === IRREGULAR_VERBS_SLUG
              ? current.pastParticiple
              : null
          }
          grammarTitle={tenseRule?.formula || null}
          grammarRule={null}
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
              ? selectedModule?.slug === IRREGULAR_VERBS_SLUG
                ? 'Irregular · Ezberleyemediklerim'
                : 'Tekrar · Ezberleyemediklerim'
              : unlearnedOnly
                ? `${selectedGroup?.label ?? ''} · Ezberleyemediklerim`
                : selectedGroup?.label
          }
          onActionComplete={goNext}
          onProgressSaved={() => {
            void refreshBadges();
            scheduleProgressRefresh();
          }}
          showPronounce
        />
      )}
    </div>
  );
}
