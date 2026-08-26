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

  const moduleTotal = progress.moduleTotal ?? 0;
  const moduleLearned = progress.moduleLearned ?? 0;
  const modulePct =
    moduleTotal > 0
      ? Math.round((moduleLearned / moduleTotal) * 100)
      : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-on-surface-variant">
          {progress.learned}/{progress.total}
          {progress.complete ? ' ✓' : ''}
        </span>
      </div>

      {showModule && moduleTotal > 0 && (
        <div className="flex items-center gap-3">
          <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
            <div
              className="h-full rounded-full bg-secondary-container transition-all duration-500"
              style={{ width: `${modulePct}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-on-surface-variant">
            {moduleLearned}/{moduleTotal}
          </span>
        </div>
      )}
    </div>
  );
}
