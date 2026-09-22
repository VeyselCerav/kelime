'use client';

import { useEffect, useState } from 'react';
import { useModule } from '../context/ModuleContext';
import { isOdevSlug } from '@/lib/odev';
import OdevPushSettings from './OdevPushSettings';

/**
 * Ödev kartlarında tek seferlik “bildirim aç” bandı.
 * Kalıcı aç/kapa: Profil.
 */
export default function OdevPushPrompt() {
  const { selectedModule } = useModule();
  const [dismissed, setDismissed] = useState(true);
  const isOdev = isOdevSlug(selectedModule?.slug);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(sessionStorage.getItem('odev-push-dismissed') === '1');
  }, []);

  if (!isOdev || dismissed) return null;

  return (
    <OdevPushSettings
      variant="compact"
      hideWhenSubscribed
      onDismiss={() => {
        sessionStorage.setItem('odev-push-dismissed', '1');
        setDismissed(true);
      }}
    />
  );
}
