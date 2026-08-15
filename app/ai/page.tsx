'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useModule } from '../context/ModuleContext';
import { useBadgeContext } from '../context/BadgeContext';
import AiParagraph from '../components/AiParagraph';
import type { HighlightWord } from '@/lib/highlight-words';

const MAX = 10;
const MIN = 3;

type ModuleGroup = {
  moduleId: number;
  slug: string;
  name: string;
  sortOrder: number;
  words: HighlightWord[];
};

type ParagraphResult = {
  title: string;
  english: string;
  turkish: string;
  words: HighlightWord[];
};

export default function AiStudioPage() {
  const { data: session, status } = useSession();
  const { selectedModuleId } = useModule();
  const { refreshBadges } = useBadgeContext();

  const [groups, setGroups] = useState<ModuleGroup[]>([]);
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [result, setResult] = useState<ParagraphResult | null>(null);
  const [showTr, setShowTr] = useState(false);
  const [active, setActive] = useState<HighlightWord | null>(null);
  const [learnedIds, setLearnedIds] = useState<Set<number>>(new Set());
  const [marking, setMarking] = useState(false);

  const loadUnlearned = async () => {
    setLoadingList(true);
    setListError('');
    try {
      const res = await fetch('/api/unlearned-words', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Liste alınamadı');
      const list: ModuleGroup[] = Array.isArray(data.modules) ? data.modules : [];
      setGroups(list);
      setModuleId((prev) => {
        if (prev && list.some((g) => g.moduleId === prev)) return prev;
        if (selectedModuleId && list.some((g) => g.moduleId === selectedModuleId)) {
          return selectedModuleId;
        }
        return list[0]?.moduleId ?? null;
      });
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    void loadUnlearned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (moduleId && groups.length && !groups.some((g) => g.moduleId === moduleId)) {
      setModuleId(groups[0]?.moduleId ?? null);
    }
  }, [groups, moduleId]);

  const current = groups.find((g) => g.moduleId === moduleId) ?? null;
  const pool = current?.words ?? [];

  useEffect(() => {
    const group = groups.find((g) => g.moduleId === moduleId);
    if (!group) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(group.words.slice(0, MAX).map((w) => w.id));
    setResult(null);
    setActive(null);
    setShowTr(false);
    // yalnızca modül değişince varsayılan seçimi yenile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const selectedWords = useMemo(
    () => pool.filter((w) => selectedIds.includes(w.id)),
    [pool, selectedIds]
  );

  const toggleWord = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return prev;
      return [...prev, id];
    });
  };

  const generate = async () => {
    if (selectedIds.length < MIN) return;
    setGenerating(true);
    setGenError('');
    setActive(null);
    setShowTr(false);
    try {
      const res = await fetch('/api/ai/paragraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Üretilemedi');
      setResult({
        title: data.title,
        english: data.english,
        turkish: data.turkish,
        words: data.words,
      });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setGenerating(false);
    }
  };

  const markLearned = async (word: HighlightWord) => {
    if (marking) return;
    setMarking(true);
    try {
      const res = await fetch('/api/learned-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: word.id, isLearned: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kaydedilemedi');
      }
      setLearnedIds((prev) => new Set(prev).add(word.id));
      setSelectedIds((prev) => prev.filter((id) => id !== word.id));
      setGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            words: g.words.filter((w) => w.id !== word.id),
          }))
          .filter((g) => g.words.length > 0)
      );
      void refreshBadges();
      setActive(null);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setMarking(false);
    }
  };

  if (status === 'loading' || loadingList) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="app-shell space-y-6 py-4">
      <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary to-[#2f4a32] p-6 text-white shadow-soft">
        <div className="relative z-10">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            AI Ezber Atölyesi
          </p>
          <h1 className="font-display text-2xl font-bold italic leading-tight sm:text-3xl">
            Kelimelerin hikâyesi
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/80">
            Ezberleyemediğin kelimelerden sade bir İngilizce paragraf ve Türkçe
            çevirisi üretir. Vurgulanan kelimeye dokun, anlamı gör, ezberle.
          </p>
        </div>
        <span className="material-symbols-outlined pointer-events-none absolute -bottom-4 -right-3 text-[120px] text-white/10">
          menu_book
        </span>
      </section>

      {listError && (
        <p className="rounded-card bg-error/10 p-4 text-sm text-error">{listError}</p>
      )}

      {groups.length === 0 ? (
        <section className="paper-texture rounded-card border border-outline-variant/40 p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-primary">
            sentiment_satisfied
          </span>
          <h2 className="mt-3 font-display text-xl font-semibold">
            Ezberleyemediğin kelime yok
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Kartlarda sola kaydırdığın kelimeler burada toplanır. Önce birkaç
            kelime işaretle, sonra AI hikâyesi üret.
          </p>
          <Link
            href="/flashcards"
            className="btn-tactile mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary"
          >
            Kartlara git
          </Link>
        </section>
      ) : (
        <>
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-outline">
              Modül
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {groups.map((g) => {
                const on = g.moduleId === moduleId;
                return (
                  <button
                    key={g.moduleId}
                    type="button"
                    onClick={() => setModuleId(g.moduleId)}
                    className={`btn-tactile shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
                      on
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant/50 bg-surface-container-lowest text-on-surface'
                    }`}
                  >
                    {g.name}
                    <span className="ml-1.5 text-xs opacity-70">{g.words.length}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-card border border-outline-variant/30 bg-surface-container-lowest p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Kelimeler</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  selectedIds.length >= MAX
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {selectedIds.length}/{MAX}
              </span>
            </div>
            <p className="mb-3 text-xs text-on-surface-variant">
              En az {MIN}, en fazla {MAX} kelime. Varsayılan: bu modülün ilk {MAX} ezberleyemediğin.
            </p>
            <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {pool.map((w) => {
                const on = selectedIds.includes(w.id);
                const locked = !on && selectedIds.length >= MAX;
                return (
                  <li key={w.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 ${
                        on ? 'bg-primary-container/25' : 'hover:bg-surface-container'
                      } ${locked ? 'opacity-40' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={on}
                        disabled={locked}
                        onChange={() => toggleWord(w.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-primary">
                          {w.english}
                        </span>
                        <span className="block truncate text-xs text-on-surface-variant">
                          {w.turkish}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating || selectedIds.length < MIN}
            className="btn-tactile flex w-full items-center justify-center gap-2 rounded-card bg-secondary-container py-4 font-display text-lg font-semibold text-on-secondary-container shadow-soft disabled:opacity-50"
          >
            {generating ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-on-secondary-container border-t-transparent" />
                Hikâye yazılıyor…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">auto_awesome</span>
                {result ? 'Yeni paragraf üret' : 'Paragraf üret'}
              </>
            )}
          </button>
        </>
      )}

      {genError && (
        <p className="rounded-card bg-error/10 p-4 text-center text-sm text-error">
          {genError}
        </p>
      )}

      {result && (
        <section className="space-y-4">
          <article className="paper-texture paper-stack rounded-card border border-outline-variant/40 p-6">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-outline">
              İngilizce
            </p>
            <h2 className="mb-4 font-display text-xl font-bold italic text-primary">
              {result.title}
            </h2>
            <AiParagraph
              text={result.english}
              words={result.words}
              activeId={active?.id ?? null}
              learnedIds={learnedIds}
              onSelect={setActive}
            />
            <p className="mt-4 text-xs text-on-surface-variant">
              Renkli kelimeye dokun — anlamı açılır.
            </p>
          </article>

          <button
            type="button"
            onClick={() => setShowTr((v) => !v)}
            className="btn-tactile w-full rounded-2xl border border-outline-variant/40 bg-surface-container-lowest py-3 text-sm font-bold text-primary"
          >
            {showTr ? 'Türkçeyi gizle' : 'Türkçesini göster'}
          </button>

          {showTr && (
            <article className="rounded-card border border-outline-variant/30 bg-surface-container-lowest p-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-outline">
                Türkçe
              </p>
              <p className="text-base leading-relaxed text-on-surface-variant">
                {result.turkish}
              </p>
            </article>
          )}

          <div className="flex flex-wrap gap-2">
            {result.words.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setActive(w)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  learnedIds.has(w.id)
                    ? 'bg-primary-container/40 text-primary line-through'
                    : active?.id === w.id
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-surface-container text-on-surface'
                }`}
              >
                {w.english}
              </button>
            ))}
          </div>
        </section>
      )}

      {active && (
        <div className="fixed inset-x-0 bottom-24 z-40 mx-auto max-w-app px-4">
          <div className="soft-shadow rounded-card border border-outline-variant/30 bg-surface-container-lowest p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-2xl font-bold text-primary">
                  {active.english}
                </p>
                <p className="mt-1 text-base text-on-surface-variant">
                  {active.turkish}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="rounded-full p-1 text-on-surface-variant"
                aria-label="Kapat"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <button
              type="button"
              disabled={marking || learnedIds.has(active.id)}
              onClick={() => void markLearned(active)}
              className="btn-tactile mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-on-primary disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">
                {learnedIds.has(active.id) ? 'check_circle' : 'done'}
              </span>
              {learnedIds.has(active.id) ? 'Ezberlendi' : 'Bu kelimeyi ezberledim'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
