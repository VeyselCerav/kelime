'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface ModuleGroup {
  moduleId: number;
  slug: string;
  name: string;
  sortOrder: number;
  words: { id: number; english: string; turkish: string }[];
}

export default function UnlearnedWordsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [modules, setModules] = useState<ModuleGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/unlearned-words');
      return;
    }
    if (status !== 'authenticated') return;

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch('/api/unlearned-words', { credentials: 'include' });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Yüklenemedi');
        }
        const data = await res.json();
        const list: ModuleGroup[] = Array.isArray(data.modules) ? data.modules : [];
        setModules(list);
        setTotal(data.total ?? list.reduce((s, m) => s + m.words.length, 0));
        if (list.length) setOpenId(list[0].moduleId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Hata');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [status, router]);

  const startPractice = (group: ModuleGroup, mode: 'cards' | 'quiz') => {
    // Learned kayıtlar DB’de kalır; sadece tekrar listesi localStorage’a yazılır
    localStorage.setItem('practiceWords', JSON.stringify(group.words));
    localStorage.setItem(
      'practiceMeta',
      JSON.stringify({
        source: 'unlearned',
        moduleId: group.moduleId,
        moduleName: group.name,
      })
    );
    window.location.href =
      mode === 'cards' ? '/flashcards?mode=practice' : '/quiz?mode=practice';
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="app-shell space-y-6 py-4">
      <div>
        <Link
          href="/stats"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← İstatistikler
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-on-surface">
          Ezberleyemediklerim
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Modül modül listelenir. Tekrar ederken ezberlediğin kelimeler geçmişinden
          silinmez.
        </p>
      </div>

      {error && (
        <p className="rounded-card bg-error/10 p-4 text-center text-error">{error}</p>
      )}

      {!error && total === 0 && (
        <div className="rounded-card bg-cream p-8 text-center shadow-organic">
          <span className="material-symbols-outlined text-4xl text-primary">
            check_circle
          </span>
          <p className="mt-3 font-display text-lg font-semibold text-on-surface">
            Harika!
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Şu an ezberleyemediğin kelime yok.
          </p>
          <Link
            href="/flashcards"
            className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-bold text-on-primary"
          >
            Kartlara git
          </Link>
        </div>
      )}

      {modules.length > 0 && (
        <p className="text-sm font-semibold text-on-surface-variant">
          Toplam {total} kelime · {modules.length} modül
        </p>
      )}

      <div className="space-y-3">
        {modules.map((m) => {
          const open = openId === m.moduleId;
          return (
            <div
              key={m.moduleId}
              className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-organic"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : m.moduleId)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold text-on-surface">
                    {m.name}
                  </p>
                  <p className="text-xs font-bold text-on-surface-variant">
                    {m.words.length} kelime
                  </p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">
                  {open ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {open && (
                <div className="border-t border-outline-variant/30 px-4 pb-4 pt-2">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startPractice(m, 'cards')}
                      className="btn-tactile inline-flex items-center gap-1 rounded-xl bg-secondary-container px-3 py-2 text-sm font-bold text-on-secondary-container"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        style
                      </span>
                      Kartlarla tekrar
                    </button>
                    <button
                      type="button"
                      disabled={m.words.length < 4}
                      onClick={() => startPractice(m, 'quiz')}
                      className="btn-tactile inline-flex items-center gap-1 rounded-xl bg-primary-container px-3 py-2 text-sm font-bold text-on-primary-container disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        quiz
                      </span>
                      Quiz ile tekrar
                    </button>
                  </div>
                  {m.words.length < 4 && (
                    <p className="mb-2 text-[11px] text-outline">
                      Quiz için en az 4 kelime gerekir.
                    </p>
                  )}

                  <ul className="max-h-72 space-y-2 overflow-y-auto">
                    {m.words.map((w) => (
                      <li
                        key={w.id}
                        className="rounded-xl bg-cream px-3 py-2.5"
                      >
                        <p className="font-semibold text-primary">{w.english}</p>
                        <p className="text-sm text-on-surface-variant">
                          {w.turkish}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
