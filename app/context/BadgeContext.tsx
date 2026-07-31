'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import type { BadgeStatus } from '@/lib/badges';
import BadgeCelebration from '../components/BadgeCelebration';

const STORAGE_KEY = 'yds-monster-earned-badges';

interface BadgeContextValue {
  badges: BadgeStatus[];
  learnedCount: number;
  streak: number;
  loading: boolean;
  refreshBadges: () => Promise<void>;
}

const BadgeContext = createContext<BadgeContextValue | undefined>(undefined);

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [badges, setBadges] = useState<BadgeStatus[]>([]);
  const [learnedCount, setLearnedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newBadge, setNewBadge] = useState<BadgeStatus | null>(null);

  const refreshBadges = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/badges');
      const data = await res.json();
      if (!Array.isArray(data.badges)) return;

      const list: BadgeStatus[] = data.badges;
      setBadges(list);
      setLearnedCount(data.learnedWordsCount ?? 0);
      setStreak(data.streak ?? 0);

      const earnedIds = list.filter((b) => b.earned).map((b) => b.id);
      const prevRaw = localStorage.getItem(STORAGE_KEY);
      const prev: string[] = prevRaw ? JSON.parse(prevRaw) : [];

      if (prevRaw !== null) {
        const freshly = list.find((b) => b.earned && !prev.includes(b.id));
        if (freshly) setNewBadge(freshly);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(earnedIds));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    void refreshBadges();
  }, [refreshBadges]);

  return (
    <BadgeContext.Provider
      value={{ badges, learnedCount, streak, loading, refreshBadges }}
    >
      {children}
      {newBadge && (
        <BadgeCelebration
          badge={newBadge}
          onClose={() => setNewBadge(null)}
        />
      )}
    </BadgeContext.Provider>
  );
}

export function useBadgeContext() {
  const ctx = useContext(BadgeContext);
  if (!ctx) {
    throw new Error('useBadgeContext must be used within BadgeProvider');
  }
  return ctx;
}
