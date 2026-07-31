'use client';

import { Suspense } from 'react';
import FlashCardsClient from './FlashCardsClient';

export default function FlashCardsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <FlashCardsClient />
    </Suspense>
  );
}
