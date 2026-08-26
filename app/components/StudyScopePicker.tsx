'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useModule } from '../context/ModuleContext';

type GroupProgress = {
  index: number;
  label: string;
  start?: number;
  end?: number;
  count: number;
  learned: number;
  total: number;
  percentage: number;
  complete: boolean;
};

function moduleShortLabel(m: {
  slug: string;
  name: string;
}) {
  if (m.slug === 'genel') return 'Genel';
  if (m.slug === 'en-sik-cikan') return 'En Sık Çıkan';
  if (m.slug === 'tense-anahtar') return 'Tense';
  if (m.slug === 'seviye-seviye') return 'Seviye Seviye';
  return m.name;
}

/** Kartlar / Quiz için modül + alt grup seçici */
export default function StudyScopePicker() {
  const { data: session } = useSession();
  const {
    modules,
    selectedModuleId,
    setSelectedModuleId,
    selectedModule,
    groups,
    selectedGroupIndex,
    setSelectedGroupIndex,
    isLoading,
  } = useModule();

  const namedGroups = selectedModule?.groupMode === 'category';
  const [groupProgress, setGroupProgress] = useState<GroupProgress[]>([]);
  const chipRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedModuleId || !session) {
      setGroupProgress([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/progress/groups?moduleId=${selectedModuleId}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.groups)) {
          setGroupProgress(data.groups);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    const onRefresh = () => void load();
    window.addEventListener('yds-scope-progress', onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener('yds-scope-progress', onRefresh);
    };
  }, [selectedModuleId, session]);

  const sortedChips = useMemo(() => {
    const progressByIndex = new Map(groupProgress.map((g) => [g.index, g]));
    const items = groups.map((g) => {
      const p = progressByIndex.get(g.index);
      return {
        index: g.index,
        label: g.label,
        start: g.start,
        end: g.end,
        count: g.count,
        complete: p?.complete ?? false,
        percentage: p?.percentage ?? 0,
        learned: p?.learned ?? 0,
        total: p?.total ?? g.count,
      };
    });
    // Sıra: seçili → 35 → 36… → başa dön (bitenler yerinde kalır, yeşil görünür)
    const byIndex = [...items].sort((a, b) => a.index - b.index);
    const n = byIndex.length;
    const sel = Number(selectedGroupIndex);
    let selPos = byIndex.findIndex((g) => Number(g.index) === sel);
    if (selPos < 0) selPos = 0;
    return [...items].sort((a, b) => {
      if (n === 0) return 0;
      const posA = byIndex.findIndex((g) => g.index === a.index);
      const posB = byIndex.findIndex((g) => g.index === b.index);
      const keyA = (posA - selPos + n) % n;
      const keyB = (posB - selPos + n) % n;
      return keyA - keyB;
    });
  }, [groups, groupProgress, selectedGroupIndex]);

  // Sadece kullanıcı grup değiştirdiğinde yatay kaydır; ilerleme güncellemesi sayfayı kaydırmaz
  const prevGroupIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevGroupIndexRef.current === selectedGroupIndex) return;
    prevGroupIndexRef.current = selectedGroupIndex;

    const scroller = scrollerRef.current;
    const el = chipRefs.current.get(selectedGroupIndex);
    if (!scroller || !el) return;

    const left =
      el.offsetLeft - scroller.clientWidth / 2 + el.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [selectedGroupIndex]);

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-surface-container" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="module-select"
          className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-outline"
        >
          Modül
        </label>
        <div className="relative">
          <select
            id="module-select"
            value={selectedModuleId ?? ''}
            onChange={(e) => setSelectedModuleId(Number(e.target.value))}
            className="w-full appearance-none rounded-2xl border border-outline-variant/40 bg-surface-container-lowest py-3.5 pl-4 pr-11 text-sm font-semibold text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {moduleShortLabel(m)} · {m.wordCount} kelime
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-on-surface-variant"
            aria-hidden
          >
            <span className="material-symbols-outlined text-[22px]">
              expand_more
            </span>
          </span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-outline">
          {namedGroups
            ? selectedModule?.slug === 'seviye-seviye'
              ? 'Seviye'
              : selectedModule?.slug === 'tense-anahtar'
                ? 'Zaman / tense'
                : 'Kategori'
            : 'Alt grup'}
        </p>
        {groups.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Bu modülde kelime yok.</p>
        ) : (
          <div
            ref={scrollerRef}
            className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          >
            {sortedChips.map((g) => {
              const active = g.index === selectedGroupIndex;
              const title = namedGroups
                ? g.label
                : g.start && g.end
                  ? `${g.label}`
                  : g.label;
              const meta = namedGroups
                ? `${g.count}`
                : g.start && g.end
                  ? `${g.start}–${g.end}`
                  : `${g.count}`;

              return (
                <button
                  key={g.index}
                  type="button"
                  ref={(node) => {
                    if (node) chipRefs.current.set(g.index, node);
                    else chipRefs.current.delete(g.index);
                  }}
                  onClick={() => setSelectedGroupIndex(g.index)}
                  className={`btn-tactile relative shrink-0 rounded-full border px-4 py-2.5 text-left transition ${
                    g.complete
                      ? active
                        ? 'border-primary bg-primary text-on-primary shadow-soft ring-2 ring-primary/40 ring-offset-2'
                        : 'border-primary bg-primary text-on-primary'
                      : active
                        ? 'border-primary bg-primary text-on-primary shadow-soft'
                        : 'border-outline-variant/35 bg-surface-container-lowest text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {g.complete && (
                      <span
                        className="material-symbols-outlined text-[16px] text-on-primary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                    )}
                    <span className="whitespace-nowrap text-sm font-bold">
                      {title}
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 block whitespace-nowrap text-[10px] font-semibold ${
                      active || g.complete
                        ? 'text-on-primary/80'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    {g.complete
                      ? 'Tamamlandı'
                      : `${meta} · ${g.learned}/${g.total || g.count}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
