'use client';

import type { BadgeStatus } from '@/lib/badges';

export default function BadgeShowcase({
  badges,
  compact = false,
}: {
  badges: BadgeStatus[];
  compact?: boolean;
}) {
  if (!badges.length) return null;

  const core = badges.filter((b) => b.type !== 'group');
  const groupEarned = badges.filter((b) => b.type === 'group' && b.earned);
  const display = compact
    ? [...core, ...groupEarned.slice(-8)]
    : [...core, ...groupEarned];

  if (!display.length) return null;

  if (compact) {
    return (
      <div className="space-y-3">
        {groupEarned.length > 0 && (
          <p className="text-xs font-bold text-on-surface-variant">
            {groupEarned.length} alt grup rozeti kazanıldı
          </p>
        )}
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
          {display.map((b) => (
            <div
              key={b.id}
              className={`flex w-[88px] shrink-0 flex-col items-center gap-2 ${
                b.earned ? '' : 'opacity-45 grayscale'
              }`}
            >
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white shadow-soft"
                style={{ background: `${b.accent}33` }}
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{
                    color: b.accent,
                    fontVariationSettings: b.earned ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {b.earned ? b.icon : 'lock'}
                </span>
              </div>
              <span className="text-center text-[11px] font-bold leading-tight text-on-surface-variant">
                {b.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {core.map((b) => (
          <BadgeCard key={b.id} b={b} />
        ))}
      </div>
      {groupEarned.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-lg font-semibold text-on-surface">
            Alt grup rozetleri ({groupEarned.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {groupEarned.map((b) => (
              <BadgeCard key={b.id} b={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BadgeCard({ b }: { b: BadgeStatus }) {
  const unit =
    b.type === 'words' ? ' kelime' : b.type === 'streak' ? ' gün' : ' kelime';
  return (
    <div
      className={`rounded-2xl border bg-cream p-4 shadow-organic ${
        b.earned
          ? 'border-primary-container/40'
          : 'border-outline-variant/30 opacity-70'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${b.accent}28` }}
        >
          <span
            className="material-symbols-outlined text-3xl"
            style={{
              color: b.accent,
              fontVariationSettings: b.earned ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            {b.earned ? b.icon : 'lock'}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-on-surface">
              {b.name}
            </h3>
            {b.earned ? (
              <span className="rounded-full bg-primary-container/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Kazanıldı
              </span>
            ) : (
              <span className="text-[10px] font-bold text-outline">
                {b.percentage}%
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-on-surface-variant">{b.description}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${b.percentage}%`, background: b.accent }}
            />
          </div>
          <p className="mt-1 text-[11px] font-medium text-outline">
            {Math.min(b.progress, b.requirement)} / {b.requirement}
            {unit}
          </p>
        </div>
      </div>
    </div>
  );
}
