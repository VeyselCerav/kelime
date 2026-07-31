'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ModulePicker from './components/ModulePicker';
import BadgeShowcase from './components/BadgeShowcase';
import ScopeProgressBar, {
  ScopeProgressView,
} from './components/ScopeProgressBar';
import { useModule } from './context/ModuleContext';
import { useBadgeContext } from './context/BadgeContext';

interface Word {
  id: number;
  english: string;
  turkish: string;
}

export default function Home() {
  const { data: session } = useSession();
  const { selectedModule, selectedModuleId, selectedGroupIndex, selectedGroup } =
    useModule();
  const { badges, learnedCount } = useBadgeContext();
  const [words, setWords] = useState<Word[]>([]);
  const [scope, setScope] = useState<ScopeProgressView | null>(null);
  const [goalTarget] = useState(20);

  useEffect(() => {
    if (!selectedModuleId) return;
    fetch(`/api/words?moduleId=${selectedModuleId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWords(data);
      })
      .catch(console.error);
  }, [selectedModuleId]);

  useEffect(() => {
    if (!selectedModuleId || !selectedGroupIndex || !session) {
      setScope(null);
      return;
    }
    fetch(
      `/api/progress/scope?moduleId=${selectedModuleId}&group=${selectedGroupIndex}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.total != null) {
          setScope({
            learned: data.learned,
            total: data.total,
            percentage: data.percentage,
            label: data.label,
            moduleLearned: data.moduleLearned,
            moduleTotal: data.moduleTotal,
            complete: data.complete,
          });
        }
      })
      .catch(console.error);
  }, [selectedModuleId, selectedGroupIndex, session, learnedCount]);

  const dailyDone = Math.min(learnedCount % goalTarget || 0, goalTarget);
  const wordOfDay = useMemo(() => {
    if (!words.length) return null;
    const day = new Date();
    const idx =
      (day.getFullYear() * 1000 + day.getMonth() * 50 + day.getDate()) %
      words.length;
    return words[idx];
  }, [words]);

  const progressPct = Math.round((dailyDone / goalTarget) * 100);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (progressPct / 100) * circumference;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  return (
    <div className="app-shell space-y-8 py-4">
      <section className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-on-surface-variant">
            {greeting()}
            {session?.user?.name ? ',' : ''}
          </p>
          <h1 className="font-display text-2xl font-bold text-primary">
            {session?.user?.name ||
              session?.user?.username ||
              session?.user?.email ||
              'Kullanıcı'}
          </h1>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold text-on-surface">
          Modül Seç
        </h2>
        <ModulePicker />
      </section>

      {scope && (
        <section>
          <ScopeProgressBar progress={scope} showModule />
          {selectedGroup && (
            <p className="mt-2 text-xs text-on-surface-variant">
              Seçili alt grup: {selectedGroup.label}
            </p>
          )}
        </section>
      )}

      <section className="paper-texture soft-shadow flex items-center justify-between rounded-card border border-outline-variant/30 p-6">
        <div className="space-y-2">
          <h2 className="font-display text-xl font-semibold text-on-surface">
            Günlük Hedef
          </h2>
          <p className="max-w-[180px] text-sm text-on-surface-variant">
            Bugün {dailyDone}/{goalTarget} kelime. Devam et!
          </p>
          <p className="text-xs font-medium text-primary">
            {selectedModule?.name || 'Modül seçin'}
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          <svg className="h-24 w-24" viewBox="0 0 100 100">
            <circle
              className="text-surface-container-high"
              cx="50"
              cy="50"
              fill="transparent"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
            />
            <circle
              className="progress-ring__circle text-primary-container"
              cx="50"
              cy="50"
              fill="transparent"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute font-display text-xl font-semibold text-primary">
            {progressPct}%
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Link
          href="/flashcards"
          className="btn-tactile flex h-48 flex-col justify-between rounded-card bg-secondary-container p-6 shadow-soft"
        >
          <div className="self-start rounded-xl bg-white/30 p-2">
            <span className="material-symbols-outlined text-on-secondary-container">
              book
            </span>
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-on-secondary-container">
              Öğrenmeye Başla
            </h3>
            <p className="text-sm text-on-secondary-container/80">
              Yeni kelimeler
            </p>
          </div>
        </Link>
        <Link
          href="/quiz"
          className="btn-tactile flex h-48 flex-col justify-between rounded-card bg-primary-container p-6 shadow-soft"
        >
          <div className="self-start rounded-xl bg-white/30 p-2">
            <span className="material-symbols-outlined text-on-primary-container">
              quiz
            </span>
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-on-primary-container">
              Quiz Çöz
            </h3>
            <p className="text-sm text-on-primary-container/80">
              Bilgini test et
            </p>
          </div>
        </Link>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-on-surface">
            Günün Kelimesi
          </h2>
          <span className="rounded-full bg-surface-container px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-outline">
            {new Date().toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
            })}
          </span>
        </div>
        <div className="paper-texture soft-shadow relative overflow-hidden rounded-card border border-outline-variant/40 p-6">
          {wordOfDay ? (
            <>
              <h3 className="font-display text-4xl font-bold italic text-primary">
                {wordOfDay.english}
              </h3>
              <div className="my-4 h-px w-12 bg-outline-variant/50" />
              <p className="text-lg leading-relaxed text-on-surface-variant">
                {wordOfDay.turkish}
              </p>
            </>
          ) : (
            <p className="text-on-surface-variant">Kelime yükleniyor…</p>
          )}
        </div>
      </section>

      <section className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-on-surface">
            Başarı Rozetleri
          </h2>
          <Link href="/stats" className="text-xs font-bold text-primary hover:underline">
            Tümü
          </Link>
        </div>
        <BadgeShowcase badges={badges} compact />
      </section>
    </div>
  );
}
