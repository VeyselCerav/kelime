'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignOutPage() {
  const [isLeaving, setIsLeaving] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    setIsLeaving(true);
    try {
      await signOut({ callbackUrl: '/login' });
    } catch {
      setIsLeaving(false);
      router.push('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md space-y-6 rounded-card bg-surface-container-lowest p-8 shadow-soft">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-on-surface">
            Çıkış yapmak istediğinize emin misiniz?
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Oturumunuz sonlandırılacak.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isLeaving}
            onClick={handleConfirm}
            className="btn-tactile flex-1 rounded-2xl bg-error py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {isLeaving ? 'Çıkış yapılıyor…' : 'Evet, Çıkış Yap'}
          </button>
          <button
            type="button"
            disabled={isLeaving}
            onClick={() => router.back()}
            className="btn-tactile flex-1 rounded-2xl border border-outline-variant/50 bg-cream py-3 text-sm font-bold text-on-surface"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
