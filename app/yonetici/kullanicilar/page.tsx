'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type UserStat = {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  learnedCount: number;
  unlearnedCount: number;
  quizCount: number;
  raceCount: number;
  raceWins: number;
  activityScore: number;
  lastActiveAt: string | null;
  learnedRank: number;
  activityRank: number;
};

type Payload = {
  totalUsers: number;
  users: UserStat[];
  topLearned: UserStat[];
  topActivity: UserStat[];
};

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<'all' | 'learned' | 'activity'>('all');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!session.user?.isAdmin) {
      router.replace('/');
      return;
    }
    void fetchUsers();
  }, [session, status, router]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!response.ok) throw new Error('Kullanıcılar yüklenemedi');
      const json = (await response.json()) as Payload;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (
      !confirm(
        'Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/users/delete?id=${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Silinemedi');
      }
      setSelectedId(null);
      void fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silme hatası');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session?.user?.isAdmin || !data) return null;

  const list =
    tab === 'learned'
      ? data.topLearned
      : tab === 'activity'
        ? data.topActivity
        : [...data.users].sort((a, b) => a.learnedRank - b.learnedRank);

  const selected = data.users.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-on-surface">
          Kullanıcılar
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {data.totalUsers} kullanıcı · detay ve sıralama
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'Tümü'],
            ['learned', 'En çok ezberleyen'],
            ['activity', 'En çok çalışan'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              tab === key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-card border border-outline-variant/30 bg-surface-container-lowest">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-container text-left text-[11px] uppercase tracking-wider text-outline">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Kullanıcı</th>
                  <th className="px-4 py-3">Ezber</th>
                  <th className="px-4 py-3">Aktivite</th>
                  <th className="px-4 py-3">Quiz</th>
                  <th className="px-4 py-3">Yarış</th>
                </tr>
              </thead>
              <tbody>
                {list.map((user) => {
                  const rank =
                    tab === 'activity' ? user.activityRank : user.learnedRank;
                  const active = selectedId === user.id;
                  return (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedId(user.id)}
                      className={`cursor-pointer border-t border-outline-variant/20 transition ${
                        active
                          ? 'bg-primary-container/20'
                          : 'hover:bg-surface-container'
                      }`}
                    >
                      <td className="px-4 py-3 font-bold text-primary">
                        {rank}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-on-surface">
                          {user.username}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {user.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {user.learnedCount}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {user.activityScore}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {user.quizCount}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {user.raceCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-card border border-outline-variant/30 bg-surface-container-lowest p-5">
          {selected ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-outline">
                  Detay
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-on-surface">
                  {selected.username}
                </h2>
                <p className="text-sm text-on-surface-variant">
                  {selected.email}
                </p>
                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    selected.isAdmin
                      ? 'bg-tertiary/15 text-tertiary'
                      : 'bg-primary-container/40 text-primary'
                  }`}
                >
                  {selected.isAdmin ? 'Admin' : 'Kullanıcı'}
                </span>
              </div>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Ezber sırası</dt>
                  <dd className="font-bold text-primary">
                    {selected.learnedRank}. / {data.totalUsers}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Çalışma sırası</dt>
                  <dd className="font-bold text-primary">
                    {selected.activityRank}. / {data.totalUsers}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Ezberlenen</dt>
                  <dd className="font-semibold">{selected.learnedCount}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Ezberleyemediği</dt>
                  <dd className="font-semibold">{selected.unlearnedCount}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Quiz</dt>
                  <dd className="font-semibold">{selected.quizCount}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Yarış</dt>
                  <dd className="font-semibold">
                    {selected.raceCount} ({selected.raceWins} galibiyet)
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Aktivite puanı</dt>
                  <dd className="font-semibold">{selected.activityScore}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Kayıt</dt>
                  <dd className="font-semibold">
                    {new Date(selected.createdAt).toLocaleDateString('tr-TR')}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Son aktif</dt>
                  <dd className="font-semibold">
                    {selected.lastActiveAt
                      ? new Date(selected.lastActiveAt).toLocaleString('tr-TR')
                      : '—'}
                  </dd>
                </div>
              </dl>

              {!selected.isAdmin && (
                <button
                  type="button"
                  onClick={() => void handleDeleteUser(selected.id)}
                  className="w-full rounded-2xl border border-error/30 py-2.5 text-sm font-bold text-error hover:bg-error/10"
                >
                  Kullanıcıyı sil
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Detay için listeden bir kullanıcı seç.
            </p>
          )}
        </aside>
      </div>

      <p className="text-xs text-on-surface-variant">
        Aktivite puanı = ezberlenen kelime + quiz sayısı + yarış sayısı (tüm
        zamanlar).
      </p>
    </div>
  );
}
