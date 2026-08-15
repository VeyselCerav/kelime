'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useModule } from '../context/ModuleContext';
import BadgeShowcase from '../components/BadgeShowcase';
import { useBadgeContext } from '../context/BadgeContext';
import { STREAK_BADGES, WORD_BADGES } from '@/lib/badges';

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

interface RaceRecent {
  id: number;
  opponent: string;
  correctCount: number;
  questionCount: number;
  durationMs: number;
  won: boolean;
  draw: boolean;
  points: number;
  createdAt: string;
}

export default function StatsPage() {
  const { data: session } = useSession();
  const { modules, selectedModule } = useModule();
  const { badges, learnedCount, streak } = useBadgeContext();
  const [weeklyData, setWeeklyData] = useState<number[]>(Array(7).fill(0));
  const [raceWins, setRaceWins] = useState(0);
  const [racePoints, setRacePoints] = useState(0);
  const [raceRecent, setRaceRecent] = useState<RaceRecent[]>([]);

  useEffect(() => {
    if (!session) return;
    fetch('/api/progress')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.weeklyData)) setWeeklyData(data.weeklyData);
      })
      .catch(console.error);

    fetch('/api/race/stats')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.wins === 'number') setRaceWins(data.wins);
        if (typeof data.points === 'number') setRacePoints(data.points);
        if (Array.isArray(data.recent)) setRaceRecent(data.recent);
      })
      .catch(console.error);
  }, [session]);

  const maxBar = Math.max(...weeklyData, 1);
  const wordBadges = badges.filter((b) => b.type === 'words');
  const streakBadges = badges.filter((b) => b.type === 'streak');
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="app-shell space-y-8 py-4">
      <h1 className="font-display text-2xl font-bold text-on-surface">
        İstatistikler
      </h1>

      {!session ? (
        <div className="rounded-card bg-cream p-6 text-center shadow-organic">
          <p className="mb-4 text-on-surface-variant">
            İlerlemeni görmek için giriş yap.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-full bg-primary px-6 py-2 font-semibold text-on-primary"
          >
            Giriş Yap
          </Link>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="relative overflow-hidden rounded-3xl bg-cream p-6 shadow-organic md:col-span-7">
              <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <span className="material-symbols-outlined text-tertiary text-base">
                  auto_stories
                </span>
                Yolculuğun
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-5xl font-bold text-primary">
                  {learnedCount}
                </span>
                <span className="font-display text-xl text-on-surface-variant/60">
                  kelime
                </span>
              </div>
              <p className="mt-2 text-sm text-on-surface-variant">
                {earnedCount}/{badges.length || WORD_BADGES.length + STREAK_BADGES.length} rozet
              </p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
                <div
                  className="h-full rounded-full bg-primary-container"
                  style={{
                    width: `${Math.min(100, (learnedCount / 500) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-3 rounded-3xl bg-cream p-6 text-center shadow-organic md:col-span-5">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FEF7E6]">
                  <span
                    className="material-symbols-outlined text-[48px] text-[#F9A825]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    local_fire_department
                  </span>
                </div>
                <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-tertiary text-[10px] font-bold text-white">
                  {streak}
                </div>
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-secondary">
                  {streak} Günlük Seri
                </h3>
                <p className="text-sm text-on-surface-variant">Zinciri kırma!</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-cream p-5 shadow-organic">
              <p className="text-[11px] font-bold uppercase tracking-wider text-outline">
                Kazanılan yarış
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-primary">
                {raceWins}
              </p>
            </div>
            <div className="rounded-3xl bg-cream p-5 shadow-organic">
              <p className="text-[11px] font-bold uppercase tracking-wider text-outline">
                Yarış puanı
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-secondary">
                {racePoints}
              </p>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                Galibiyet +25 · doğru +2
              </p>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl bg-cream p-6 shadow-organic">
            <h2 className="font-display text-xl font-semibold text-on-surface">
              Haftalık İlerleme
            </h2>
            <div className="flex h-48 items-end justify-between gap-1 px-1">
              {DAY_LABELS.map((label, i) => {
                const h = Math.max(8, (weeklyData[i] / maxBar) * 100);
                return (
                  <div key={label} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="chart-bar w-8 rounded-t-xl bg-primary-container md:w-12"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[11px] font-bold text-on-surface-variant">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-on-surface">
                Ezberleyemediklerim
              </h2>
              <Link
                href="/unlearned-words"
                className="text-xs font-bold text-primary hover:underline"
              >
                Tümü
              </Link>
            </div>
            <Link
              href="/unlearned-words"
              className="btn-tactile flex items-center justify-between rounded-2xl border border-outline-variant/40 bg-cream px-4 py-4 shadow-organic"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">
                  replay
                </span>
                <div>
                  <p className="font-semibold text-on-surface">
                    Modül modül tekrar et
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Kart veya quiz ile çalış; ezberlediklerin silinmez
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline">
                chevron_right
              </span>
            </Link>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-on-surface">
                Son yarışlar
              </h2>
              <Link href="/yaris" className="text-xs font-bold text-primary hover:underline">
                Yarışa gir
              </Link>
            </div>
            {raceRecent.length === 0 ? (
              <p className="rounded-card bg-cream p-4 text-sm text-on-surface-variant shadow-organic">
                Henüz yarışın yok. Hazır bir rakibe davet gönder.
              </p>
            ) : (
              <div className="space-y-2">
                {raceRecent.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-2xl border border-outline-variant/30 bg-cream px-4 py-3 shadow-organic"
                  >
                    <div>
                      <p className="font-semibold text-on-surface">
                        vs {row.opponent} · {row.correctCount}/{row.questionCount}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {new Date(row.createdAt).toLocaleString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' · '}+{row.points} puan
                      </p>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        row.draw
                          ? 'bg-surface-container text-on-surface-variant'
                          : row.won
                            ? 'bg-primary-container/30 text-primary'
                            : 'bg-error/10 text-error'
                      }`}
                    >
                      {row.draw ? 'Berabere' : row.won ? 'Galibiyet' : 'Mağlubiyet'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-on-surface">
              Kelime Rozetleri
            </h2>
            <p className="text-sm text-on-surface-variant">
              Her 50 kelimede yeni bir rozet (50–500).
            </p>
            <BadgeShowcase
              badges={
                wordBadges.length
                  ? wordBadges
                  : WORD_BADGES.map((b) => ({
                      ...b,
                      earned: false,
                      progress: 0,
                      percentage: 0,
                    }))
              }
            />
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-on-surface">
              Seri Rozetleri
            </h2>
            <p className="text-sm text-on-surface-variant">
              3, 7, 14 ve 30 günlük çalışma serileri.
            </p>
            <BadgeShowcase
              badges={
                streakBadges.length
                  ? streakBadges
                  : STREAK_BADGES.map((b) => ({
                      ...b,
                      earned: false,
                      progress: 0,
                      percentage: 0,
                    }))
              }
            />
          </section>

          <section className="space-y-3 pb-2">
            <h2 className="font-display text-xl font-semibold text-on-surface">
              Modül Hakimiyeti
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {modules.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-2xl border-b-4 bg-cream p-4 shadow-organic ${
                    m.slug === 'en-sik-cikan'
                      ? 'border-secondary-container/50'
                      : 'border-primary-container/50'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined ${
                        m.slug === 'en-sik-cikan' ? 'text-secondary' : 'text-primary'
                      }`}
                    >
                      {m.slug === 'en-sik-cikan'
                        ? 'local_fire_department'
                        : 'auto_stories'}
                    </span>
                    <p className="font-medium text-on-surface">{m.name}</p>
                  </div>
                  <p
                    className={`font-display text-2xl font-bold ${
                      m.slug === 'en-sik-cikan' ? 'text-secondary' : 'text-primary'
                    }`}
                  >
                    {m.wordCount} kelime
                  </p>
                  {selectedModule?.id === m.id && (
                    <p className="mt-1 text-xs font-bold text-outline">Seçili modül</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="relative flex items-center justify-between overflow-hidden rounded-3xl bg-secondary-container/40 p-6">
            <div className="relative z-10 space-y-1">
              <p className="font-display text-xl font-semibold text-on-secondary-container">
                Çalışmaya hazır mısın?
              </p>
              <p className="text-sm text-on-secondary-container/80">
                Günlük hedefine biraz daha yakınlaş.
              </p>
            </div>
            <Link
              href="/quiz"
              className="relative z-10 rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-white shadow-lg active:scale-95"
            >
              Quiz Başlat
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
