'use client';

import { useModule } from '../context/ModuleContext';

export default function ModulePicker({ compact = false }: { compact?: boolean }) {
  const { modules, selectedModuleId, setSelectedModuleId, isLoading } = useModule();

  if (isLoading) {
    return (
      <div className="h-12 animate-pulse rounded-2xl bg-surface-container" />
    );
  }

  return (
    <div
      className={`grid gap-3 ${
        compact
          ? 'grid-cols-2'
          : modules.length > 2
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2'
      }`}
    >
      {modules.map((m, i) => {
        const active = m.id === selectedModuleId;
        const accent = i % 3;
        const activeClass =
          accent === 1
            ? 'border-secondary bg-secondary-container/40 shadow-soft'
            : accent === 2
              ? 'border-tertiary bg-tertiary/15 shadow-soft'
              : 'border-primary bg-primary-container/30 shadow-soft';
        const icon =
          m.slug === 'en-sik-cikan'
            ? 'local_fire_department'
            : m.slug === 'genel'
              ? 'auto_stories'
              : m.slug === 'tense-anahtar'
                ? 'schedule'
                : 'folder_open';
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelectedModuleId(m.id)}
            className={`btn-tactile rounded-card border p-4 text-left transition ${
              active
                ? activeClass
                : 'border-outline-variant/40 bg-surface-container-lowest hover:border-primary-container'
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`material-symbols-outlined ${
                  accent === 1
                    ? 'text-secondary'
                    : accent === 2
                      ? 'text-tertiary'
                      : 'text-primary'
                }`}
              >
                {icon}
              </span>
              <span className="font-display text-lg font-semibold text-on-surface line-clamp-2">
                {m.name}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant">
              {m.wordCount} kelime
              {typeof m.groupCount === 'number' ? ` · ${m.groupCount} grup` : ''}
              {m.description ? ` · ${m.description}` : ''}
            </p>
          </button>
        );
      })}
    </div>
  );
}
