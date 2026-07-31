'use client';

export interface ScopeProgressView {
  learned: number;
  total: number;
  percentage: number;
  label?: string;
  moduleLearned?: number;
  moduleTotal?: number;
  complete?: boolean;
}

export default function ScopeProgressBar({
  progress,
  showModule = false,
}: {
  progress: ScopeProgressView | null;
  showModule?: boolean;
}) {
  if (!progress || progress.total === 0) return null;

  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-outline">
          Alt grup ilerlemesi
        </p>
        <p className="text-sm font-bold text-primary">
          {progress.learned}/{progress.total}
          {progress.complete ? ' · Tamam' : ''}
        </p>
      </div>
      {progress.label && (
        <p className="mt-0.5 text-xs text-on-surface-variant">{progress.label}</p>
      )}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-highest">
        <div
          className="h-full rounded-full bg-primary-container transition-all duration-500"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {showModule &&
        typeof progress.moduleTotal === 'number' &&
        progress.moduleTotal > 0 && (
          <div className="mt-3 border-t border-outline-variant/30 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-outline">
                Modül
              </p>
              <p className="text-xs font-semibold text-on-surface-variant">
                {progress.moduleLearned ?? 0}/{progress.moduleTotal}
              </p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
              <div
                className="h-full rounded-full bg-secondary-container transition-all duration-500"
                style={{
                  width: `${Math.round(
                    ((progress.moduleLearned ?? 0) / progress.moduleTotal) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
    </div>
  );
}
