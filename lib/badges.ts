export type BadgeType = 'words' | 'streak';

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  requirement: number;
  type: BadgeType;
  icon: string;
  accent: string;
}

export interface BadgeStatus extends BadgeDef {
  earned: boolean;
  progress: number;
  percentage: number;
}

/** Her 50 kelime: 50 → 500 */
export const WORD_BADGES: BadgeDef[] = [
  { id: 'words-50', name: 'İlk Elli', description: '50 kelime ezberledin', requirement: 50, type: 'words', icon: 'emoji_events', accent: '#7d9e7e' },
  { id: 'words-100', name: 'Yüzlük', description: '100 kelime ezberledin', requirement: 100, type: 'words', icon: 'military_tech', accent: '#476649' },
  { id: 'words-150', name: 'Azimli Öğrenci', description: '150 kelime ezberledin', requirement: 150, type: 'words', icon: 'workspace_premium', accent: '#8f4c27' },
  { id: 'words-200', name: 'İki Yüzlük', description: '200 kelime ezberledin', requirement: 200, type: 'words', icon: 'star', accent: '#c9847a' },
  { id: 'words-250', name: 'Çeyrek Bin', description: '250 kelime ezberledin', requirement: 250, type: 'words', icon: 'diamond', accent: '#894e46' },
  { id: 'words-300', name: 'Üç Yüzlük', description: '300 kelime ezberledin', requirement: 300, type: 'words', icon: 'auto_awesome', accent: '#fea77a' },
  { id: 'words-350', name: 'Kelime Avcısı', description: '350 kelime ezberledin', requirement: 350, type: 'words', icon: 'psychology', accent: '#7d9e7e' },
  { id: 'words-400', name: 'Dört Yüzlük', description: '400 kelime ezberledin', requirement: 400, type: 'words', icon: 'school', accent: '#476649' },
  { id: 'words-450', name: 'Sınava Hazır', description: '450 kelime ezberledin', requirement: 450, type: 'words', icon: 'verified', accent: '#8f4c27' },
  { id: 'words-500', name: 'Yarım Bin', description: '500 kelime ezberledin', requirement: 500, type: 'words', icon: 'emoji_events', accent: '#F9A825' },
];

/** Gün serisi rozetleri */
export const STREAK_BADGES: BadgeDef[] = [
  { id: 'streak-3', name: '3 Gün Seri', description: '3 gün üst üste çalıştın', requirement: 3, type: 'streak', icon: 'local_fire_department', accent: '#fea77a' },
  { id: 'streak-7', name: 'Haftalık Ateş', description: '7 gün üst üste çalıştın', requirement: 7, type: 'streak', icon: 'whatshot', accent: '#8f4c27' },
  { id: 'streak-14', name: 'İki Hafta Gücü', description: '14 gün üst üste çalıştın', requirement: 14, type: 'streak', icon: 'bolt', accent: '#c9847a' },
  { id: 'streak-30', name: 'Aylık Efsane', description: '30 gün üst üste çalıştın', requirement: 30, type: 'streak', icon: 'brightness_7', accent: '#F9A825' },
];

export const ALL_BADGES: BadgeDef[] = [...WORD_BADGES, ...STREAK_BADGES];

export function evaluateBadges(
  learnedCount: number,
  streak: number
): BadgeStatus[] {
  return ALL_BADGES.map((badge) => {
    const progress = badge.type === 'words' ? learnedCount : streak;
    const earned = progress >= badge.requirement;
    const percentage = Math.min(
      100,
      Math.round((progress / badge.requirement) * 100)
    );
    return { ...badge, earned, progress, percentage };
  });
}

export function dayKey(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Ardışık çalışma günü serisi (bugün veya dünden geriye) */
export function computeStreakFromDates(dates: Date[]): number {
  if (!dates.length) return 0;
  const days = new Set(dates.map(dayKey));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!days.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  if (!days.has(cursor.getTime())) return 0;

  let streak = 0;
  while (days.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
