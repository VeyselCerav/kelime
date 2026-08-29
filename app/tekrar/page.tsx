'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import WordCard from '../components/WordCard';
import { useBadgeContext } from '../context/BadgeContext';
import { getLockedScrollY, pinWindowScroll } from '@/lib/scroll-lock';

interface ReviewWord {
  id: number;
  english: string;
  turkish: string;
  moduleId: number;
  imageUrl?: string | null;
  moduleSlug?: string | null;
}

function TekrarClient() {
  const { status } = useSession();
  const { refreshBadges } = useBadgeContext();
  const searchParams = useSearchParams();
  const scope = searchParams.get('scope') === 'weekly' ? 'weekly' : 'daily';
  const [words, setWords] = useState<ReviewWord[]>([]);
  const [index, setIndex] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const label = scope === 'weekly' ? 'Haftalık tekrar' : 'Günlük tekrar';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reviewRes, favRes] = await Promise.all([
        fetch(`/api/review?scope=${scope}`, {
          cache: 'no-store',
          credentials: 'include',
        }),
        fetch('/api/favorites', { cache: 'no-store', credentials: 'include' }),
      ]);
      const data = await reviewRes.json();
      if (!reviewRes.ok) throw new Error(data.error || 'Liste alınamadı');
      setWords(Array.isArray(data.words) ? data.words : []);
      setIndex(0);
      if (favRes.ok) {
        const fav = await favRes.json();
        setFavoriteIds(new Set(Array.isArray(fav.wordIds) ? fav.wordIds : []));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void load();
  }, [status, load]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="app-shell py-8 text-center">
        <p className="text-on-surface-variant">Tekrar için giriş yap.</p>
        <Link href="/login" className="mt-4 inline-block font-bold text-primary">
          Giriş Yap
        </Link>
      </div>
    );
  }

  const current = words[index];

  return (
    <div className="app-shell space-y-6 py-4">
      <div>
        <Link href="/stats" className="text-sm font-bold text-primary">
          ← İstatistik
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-on-surface">
          {label}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {scope === 'weekly'
            ? 'Son 7 günde ezberlediğin kelimeler.'
            : 'Bugün ezberlediğin kelimeler.'}
        </p>
      </div>

      {error && (
        <p className="rounded-card bg-error/10 p-3 text-sm text-error">{error}</p>
      )}

      {words.length === 0 ? (
        <section className="paper-texture rounded-card border border-outline-variant/40 p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-primary">
            event_repeat
          </span>
          <h2 className="mt-3 font-display text-xl font-semibold">
            {scope === 'weekly'
              ? 'Bu hafta ezberlenen kelime yok'
              : 'Bugün ezberlenen kelime yok'}
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Kartlarda sağa kaydırarak kelime ezberle, sonra burada tekrar et.
          </p>
          <Link
            href="/flashcards"
            className="btn-tactile mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary"
          >
            Kartlara git
          </Link>
        </section>
      ) : current ? (
        <WordCard
          english={current.english}
          turkish={current.turkish}
          wordId={current.id}
          imageUrl={current.imageUrl}
          moduleSlug={current.moduleSlug}
          isAuthenticated
          isFavorite={favoriteIds.has(current.id)}
          onFavoriteChange={(id, favorited) => {
            setFavoriteIds((prev) => {
              const next = new Set(prev);
              if (favorited) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
          progressLabel={`${label} · ${index + 1}/${words.length}`}
          onActionComplete={() => {
            const y =
              getLockedScrollY() ??
              (typeof window !== 'undefined' ? window.scrollY : 0);
            setIndex((i) => (i + 1 < words.length ? i + 1 : 0));
            pinWindowScroll(y);
          }}
          onProgressSaved={() => void refreshBadges()}
        />
      ) : null}
    </div>
  );
}

export default function TekrarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <TekrarClient />
    </Suspense>
  );
}
