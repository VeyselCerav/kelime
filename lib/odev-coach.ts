/**
 * Ödev antrenman modeli (1B+2C+3D+4A)
 * - Telemetry: quiz / kart süresi / flip / hızlı ezber
 * - Kutular: 0=bugün → 1=+1g → 2=+3g → 3=+7g
 */

export const ODEV_EVENT_TYPES = [
  'quiz_ok',
  'quiz_fail',
  'card_show',
  'flip',
  'learn',
  'unlearn',
] as const;

export type OdevEventType = (typeof ODEV_EVENT_TYPES)[number];

export function isOdevEventType(v: string): v is OdevEventType {
  return (ODEV_EVENT_TYPES as readonly string[]).includes(v);
}

/** Flip etmeden veya bu süreden kısa “ezberledim” → şüpheli */
export const ODEV_FAST_LEARN_MS = 3000;
/** Kartta uzun takılıp ezberlenemedi */
export const ODEV_SLOW_UNLEARN_MS = 8000;

/** Leitner kutusu → gün */
export const ODEV_BOX_DAYS = [0, 1, 3, 7] as const;

export type OdevStateSnapshot = {
  difficultyScore: number;
  box: number;
  dueAt: Date;
  wrongStreak: number;
  quizWrong: number;
  quizCorrect: number;
  fastLearnCount: number;
  slowUnlearnCount: number;
};

export function defaultOdevState(now = new Date()): OdevStateSnapshot {
  return {
    difficultyScore: 0,
    box: 0,
    dueAt: now,
    wrongStreak: 0,
    quizWrong: 0,
    quizCorrect: 0,
    fastLearnCount: 0,
    slowUnlearnCount: 0,
  };
}

export function dueAtForBox(box: number, from = new Date()): Date {
  const clamped = Math.max(0, Math.min(3, Math.floor(box)));
  const days = ODEV_BOX_DAYS[clamped] ?? 0;
  const d = new Date(from.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  if (clamped === 0) return from;
  return d;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

export type OdevEventInput = {
  type: OdevEventType;
  durationMs?: number | null;
  flipped?: boolean | null;
};

/**
 * Bir olaya göre state güncelle.
 * 3D: quiz streak, hızlı ezber, yavaş unlearn.
 */
export function applyOdevEvent(
  prev: OdevStateSnapshot,
  event: OdevEventInput,
  now = new Date()
): OdevStateSnapshot {
  const next: OdevStateSnapshot = { ...prev };
  const dur = event.durationMs ?? null;
  const flipped = event.flipped === true;

  switch (event.type) {
    case 'card_show':
    case 'flip':
      // Ham log; skor değişmez
      break;

    case 'quiz_fail': {
      next.quizWrong += 1;
      next.wrongStreak += 1;
      next.difficultyScore = clampScore(
        next.difficultyScore + 12 + Math.min(20, next.wrongStreak * 4)
      );
      next.box = 0;
      next.dueAt = now;
      break;
    }

    case 'quiz_ok': {
      next.quizCorrect += 1;
      next.wrongStreak = 0;
      next.difficultyScore = clampScore(next.difficultyScore - 8);
      next.box = Math.min(3, next.box + 1);
      next.dueAt = dueAtForBox(next.box, now);
      break;
    }

    case 'learn': {
      const fast = !flipped || (dur != null && dur < ODEV_FAST_LEARN_MS);
      if (fast) {
        next.fastLearnCount += 1;
        next.difficultyScore = clampScore(next.difficultyScore + 10);
        next.box = 0;
        next.dueAt = now;
      } else {
        next.difficultyScore = clampScore(next.difficultyScore - 5);
        next.wrongStreak = 0;
        next.box = Math.min(3, Math.max(next.box, 1));
        next.dueAt = dueAtForBox(next.box, now);
      }
      break;
    }

    case 'unlearn': {
      const slow = dur != null && dur >= ODEV_SLOW_UNLEARN_MS;
      if (slow) next.slowUnlearnCount += 1;
      next.difficultyScore = clampScore(
        next.difficultyScore + (slow ? 15 : 10)
      );
      next.box = 0;
      next.dueAt = now;
      break;
    }
  }

  return next;
}

/** due veya yüksek zorluk → antrenman adayı */
export function isOdevHardCandidate(
  state: OdevStateSnapshot,
  now = new Date()
): boolean {
  if (state.dueAt.getTime() <= now.getTime()) return true;
  if (state.difficultyScore >= 25) return true;
  if (state.wrongStreak >= 2) return true;
  if (state.fastLearnCount >= 2 && state.quizCorrect < state.quizWrong + 1)
    return true;
  return false;
}

/** Sıralama: due önce, sonra skor desc, sonra wordId */
export function compareOdevCoachPriority(
  a: { dueAt: Date; difficultyScore: number; wordId: number },
  b: { dueAt: Date; difficultyScore: number; wordId: number },
  now = new Date()
): number {
  const aDue = a.dueAt.getTime() <= now.getTime() ? 0 : 1;
  const bDue = b.dueAt.getTime() <= now.getTime() ? 0 : 1;
  if (aDue !== bDue) return aDue - bDue;
  if (b.difficultyScore !== a.difficultyScore)
    return b.difficultyScore - a.difficultyScore;
  return a.wordId - b.wordId;
}

/** Ödev grup içinde: due/zorlar öne, kalanlar id sırası */
export function prioritizeOdevWords<T extends { id: number }>(
  words: T[],
  states: { wordId: number; dueAt: Date; difficultyScore: number }[],
  now = new Date()
): T[] {
  const map = new Map(states.map((s) => [s.wordId, s]));
  return [...words].sort((a, b) => {
    const sa = map.get(a.id);
    const sb = map.get(b.id);
    const hot = (s?: { dueAt: Date; difficultyScore: number }) =>
      s && (s.dueAt.getTime() <= now.getTime() || s.difficultyScore >= 20)
        ? 0
        : 1;
    const ha = hot(sa);
    const hb = hot(sb);
    if (ha !== hb) return ha - hb;
    if (ha === 0 && sa && sb) {
      return compareOdevCoachPriority(
        { dueAt: sa.dueAt, difficultyScore: sa.difficultyScore, wordId: a.id },
        { dueAt: sb.dueAt, difficultyScore: sb.difficultyScore, wordId: b.id },
        now
      );
    }
    return a.id - b.id;
  });
}
