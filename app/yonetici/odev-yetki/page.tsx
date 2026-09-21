'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type UserRow = {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
};

type Payload = {
  module: { id: number; name: string; slug: string; isRestricted: boolean };
  grantedUserIds: number[];
  users: UserRow[];
};

export default function OdevYetkiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/module-access', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Yüklenemedi');
      setData(json as Payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
    void load();
  }, [session, status, router, load]);

  const toggle = async (userId: number, grant: boolean) => {
    setBusyId(userId);
    setError('');
    try {
      const res = await fetch('/api/admin/module-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, grant }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Güncellenemedi');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncelleme hatası');
    } finally {
      setBusyId(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session?.user?.isAdmin) return null;

  const granted = new Set(data?.grantedUserIds || []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-on-surface">
          Ödev modülü yetkisi
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {data
            ? `${data.module.name} — seçilen kullanıcılar görür. Admin her zaman görür.`
            : 'Modül bilgisi yüklenemedi'}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      )}

      {data && (
        <div className="overflow-hidden rounded-card border border-outline-variant/30 bg-surface-container-lowest">
          <ul className="divide-y divide-outline-variant/20">
            {data.users.map((u) => {
              const on = granted.has(u.id);
              return (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div className="font-semibold text-on-surface">
                      {u.username}
                      {u.isAdmin ? (
                        <span className="ml-2 text-xs font-bold text-primary">
                          Admin
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {u.email}
                    </div>
                  </div>
                  {u.isAdmin ? (
                    <span className="text-xs text-on-surface-variant">
                      Otomatik erişim
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => void toggle(u.id, !on)}
                      className={`min-h-[40px] rounded-full px-4 text-xs font-bold transition disabled:opacity-50 ${
                        on
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {on ? 'Yetki var · Kaldır' : 'Yetki ver'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
