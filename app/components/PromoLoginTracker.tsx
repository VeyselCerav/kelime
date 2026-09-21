'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

/** Promo mailinden gelen kullanıcı giriş yapınca admin bildirimi tetikler */
export default function PromoLoginTracker() {
  const { status } = useSession();
  const sent = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || sent.current) return;
    sent.current = true;
    void fetch('/api/promo/notify-login', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {
      sent.current = false;
    });
  }, [status]);

  return null;
}
