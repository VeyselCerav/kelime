'use client';

import { useModule } from '../context/ModuleContext';

/** Kartlar / Quiz için modül + alt grup seçici */
export default function StudyScopePicker() {
  const {
    modules,
    selectedModuleId,
    setSelectedModuleId,
    selectedModule,
    groups,
    selectedGroupIndex,
    setSelectedGroupIndex,
    selectedGroup,
    isLoading,
  } = useModule();

  const namedGroups = selectedModule?.groupMode === 'category';

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-surface-container" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-outline">
          Modül
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {modules.map((m, i) => {
            const active = m.id === selectedModuleId;
            const accent = i % 3;
            const activeClass =
              accent === 1
                ? 'border-secondary bg-secondary-container/40'
                : accent === 2
                  ? 'border-tertiary bg-tertiary/15'
                  : 'border-primary bg-primary-container/30';
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModuleId(m.id)}
                className={`btn-tactile rounded-2xl border px-3 py-3 text-left transition ${
                  active
                    ? activeClass
                    : 'border-outline-variant/40 bg-surface-container-lowest'
                }`}
              >
                <p className="font-display text-sm font-semibold text-on-surface line-clamp-2">
                  {m.slug === 'genel'
                    ? 'Genel'
                    : m.slug === 'en-sik-cikan'
                      ? 'En Sık Çıkan'
                      : m.slug === 'tense-anahtar'
                        ? 'Tense'
                        : m.name}
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  {m.wordCount} kelime · {m.groupCount ?? groups.length}{' '}
                  {m.groupMode === 'category' ? 'zaman' : 'grup'}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor="subgroup-select"
          className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-outline"
        >
          {namedGroups ? 'Zaman / tense' : 'Alt grup (20’şer)'}
        </label>
        {groups.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Bu modülde kelime yok.</p>
        ) : (
          <div className="relative">
            <select
              id="subgroup-select"
              value={selectedGroupIndex}
              onChange={(e) => setSelectedGroupIndex(Number(e.target.value))}
              className="btn-tactile w-full appearance-none rounded-2xl border border-outline-variant/50 bg-surface-container-lowest py-3.5 pl-4 pr-11 text-sm font-semibold text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {groups.map((g) => (
                <option key={g.index} value={g.index}>
                  {namedGroups
                    ? `${g.label} (${g.count} kelime)`
                    : `${g.label} · ${g.start}–${g.end} (${g.count} kelime)`}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-on-surface-variant"
              aria-hidden
            >
              <span className="material-symbols-outlined text-[22px]">expand_more</span>
            </span>
          </div>
        )}
        {selectedGroup && (
          <p className="mt-2 text-xs text-on-surface-variant">
            Seçili:{' '}
            <span className="font-semibold text-primary">{selectedGroup.label}</span>
            {namedGroups ? (
              <> · {selectedGroup.count} kelime</>
            ) : (
              <>
                {' · '}
                {selectedGroup.start}–{selectedGroup.end}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
