'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import WordCard from '../components/WordCard';
import { useModule } from '../context/ModuleContext';
import { isOdevSlug } from '@/lib/odev';

type CoachWord = {
  id: number;
  english: string;
  turkish: string;
  category?: string | null;
  imageUrl?: string | null;
  moduleId: number;
  coach: {
    difficultyScore: number;
    box: number;
    dueAt: string;
    wrongStreak: number;
  };
};

export default function OdevAntrenmanPage() {
  const { status } = useSession();
  const { modules, setSelectedModuleId, selectedModule } = useModule();
  const [words, setWords] = useState<CoachWord[]>([]);
  const [index, setIndex] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);

  const odevModule = modules.find((m) => isOdevSlug(m.slug));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setDone(false);
    setIndex(0);
    try {
      const res = await fetch('/api/odev/coach?mode=due&limit=12', {
        cache: 'no-store',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Antrenman yüklenemedi');
      setWords(Array.isArray(data.words) ? data.words : []);
      setDueCount(Number(data.dueCount) || 0);
      setHardCount(Number(data.hardCount) || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (odevModule) setSelectedModuleId(odevModule.id);
    void load();
  }, [status, odevModule, setSelectedModuleId, load]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void (async () => {
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
    })();
  }, [status]);

  const current = words[index];

  const goNext = () => {
    if (index + 1 >= words.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="app-shell mx-auto max-w-lg px-4 py-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-on-surface">
            Ödev Antrenman
          </h1>
          <p className="mt-1 text-xs text-on-surface-variant">
            Vadesi gelen ve zor kelimeler · kutu: bugün → 1g → 3g → 7g
          </p>
          <p className="mt-1 text-[11px] text-outline">
            Due {dueCount} · Zor {hardCount}
            {selectedModule && isOdevSlug(selectedModule.slug)
              ? ` · ${selectedModule.name}`
              : ''}
          </p>
        </div>
        <Link
          href="/flashcards"
          className="text-xs font-semibold text-secondary"
        >
          Kartlar
        </Link>
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      ) : null}

      {!error && words.length === 0 ? (
        <div className="rounded-[24px] border border-outline-variant/40 bg-surface-container-low p-6 text-center">
          <p className="font-display text-lg font-bold text-on-surface">
            Şu an due kelime yok
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Ödev kartları ve quiz ile çalış; yanlışlar ve hızlı ezberler burada
            birikir.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/flashcards"
              className="rounded-full bg-primary py-3 text-sm font-semibold text-on-primary"
            >
              Ödev kartlarına git
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-outline-variant py-3 text-sm font-semibold text-on-surface"
            >
              Yenile
            </button>
          </div>
        </div>
      ) : null}

      {done ? (
        <div className="rounded-[24px] border border-outline-variant/40 bg-surface-container-low p-6 text-center">
          <p className="font-display text-lg font-bold text-on-surface">
            Tur tamam
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            {words.length} kelime çalışıldı.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-on-primary"
          >
            Yeni tur
          </button>
        </div>
      ) : null}

      {current && !done ? (
        <>
          <p className="mb-3 text-center text-xs font-bold text-outline">
            {index + 1}/{words.length}
            {current.category ? ` · ${current.category}` : ''}
            {` · skor ${Math.round(current.coach.difficultyScore)}`}
          </p>
          <WordCard
            wordId={current.id}
            english={current.english}
            turkish={current.turkish}
            imageUrl={current.imageUrl}
            moduleSlug="odev"
            showPronounce
            isFavorite={favoriteIds.has(current.id)}
            onFavoriteChange={(id, fav) => {
              setFavoriteIds((prev) => {
                const n = new Set(prev);
                if (fav) n.add(id);
                else n.delete(id);
                return n;
              });
            }}
            onActionComplete={goNext}
          />
        </>
      ) : null}
    </div>
  );
}
