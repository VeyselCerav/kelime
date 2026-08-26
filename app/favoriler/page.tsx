'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import WordCard from '../components/WordCard';
import { useBadgeContext } from '../context/BadgeContext';

interface FavWord {
  id: number;
  english: string;
  turkish: string;
  moduleId: number;
}

export default function FavorilerPage() {
  const { status } = useSession();
  const { refreshBadges } = useBadgeContext();
  const [words, setWords] = useState<FavWord[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'list' | 'cards'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/favorites', {
        cache: 'no-store',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Favoriler alınamadı');
      setWords(Array.isArray(data.words) ? data.words : []);
      setIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setLoading(false);
    }
  }, []);

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
        <p className="text-on-surface-variant">Favoriler için giriş yap.</p>
        <Link href="/login" className="mt-4 inline-block font-bold text-primary">
          Giriş Yap
        </Link>
      </div>
    );
  }

  const current = words[index];

  return (
    <div className="app-shell space-y-6 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            Favorilerim
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Kartlardan yıldızladığın kelimeler. Buradan tekrar çalış.
          </p>
        </div>
        {words.length > 0 && (
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'list' ? 'cards' : 'list'))}
            className="btn-tactile shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary"
          >
            {mode === 'list' ? 'Kartlarla çalış' : 'Listeye dön'}
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-card bg-error/10 p-3 text-sm text-error">{error}</p>
      )}

      {words.length === 0 ? (
        <section className="paper-texture rounded-card border border-outline-variant/40 p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-secondary">
            star
          </span>
          <h2 className="mt-3 font-display text-xl font-semibold">
            Henüz favori yok
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Kartlarda altındaki Favoriye Ekle ile kelime kaydet.
          </p>
          <Link
            href="/flashcards"
            className="btn-tactile mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary"
          >
            Kartlara git
          </Link>
        </section>
      ) : mode === 'list' ? (
        <ul className="space-y-2">
          {words.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between gap-2 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary">{w.english}</p>
                <p className="truncate text-sm text-on-surface-variant">
                  {w.turkish}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label={`${w.english} telaffuzunu dinle`}
                  onClick={() => {
                    if (typeof window === 'undefined' || !window.speechSynthesis) {
                      return;
                    }
                    window.speechSynthesis.cancel();
                    const utter = new SpeechSynthesisUtterance(w.english);
                    utter.lang = 'en-US';
                    utter.rate = 0.9;
                    const voices = window.speechSynthesis.getVoices();
                    const en =
                      voices.find((v) => v.lang === 'en-US') ||
                      voices.find((v) => v.lang.startsWith('en'));
                    if (en) utter.voice = en;
                    window.speechSynthesis.speak(utter);
                  }}
                  className="rounded-full p-2 text-primary"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    volume_up
                  </span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/favorites', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ wordId: w.id }),
                    });
                    setWords((prev) => prev.filter((x) => x.id !== w.id));
                  }}
                  className="text-xs font-bold text-error"
                >
                  Çıkar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : current ? (
        <WordCard
          english={current.english}
          turkish={current.turkish}
          wordId={current.id}
          isAuthenticated
          isFavorite
          progressLabel={`Favori · ${index + 1}/${words.length}`}
          onFavoriteChange={(id, favorited) => {
            if (!favorited) {
              setWords((prev) => {
                const next = prev.filter((x) => x.id !== id);
                setIndex((i) => (i >= next.length ? Math.max(0, next.length - 1) : i));
                return next;
              });
            }
          }}
          onActionComplete={() =>
            setIndex((i) => (i + 1 < words.length ? i + 1 : 0))
          }
          onProgressSaved={() => void refreshBadges()}
          showPronounce
        />
      ) : null}
    </div>
  );
}
