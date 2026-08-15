import { prisma } from '@/lib/prisma';
import { findWordsForGroup } from '@/lib/module-groups';

export const RACE_QUESTION_COUNT = 20;
export const READY_WINDOW_MS = 8000;
export const INVITE_TTL_MS = 45000;
export const WIN_BONUS = 25;
export const POINTS_PER_CORRECT = 2;

export type RaceQuestion = {
  id: number;
  question: string;
  options: string[];
  answer: string;
  wordId: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function buildRaceQuestions(
  moduleId: number,
  groupIndex: number
): Promise<RaceQuestion[]> {
  const group = await findWordsForGroup({ moduleId, groupIndex });
  let words = [...group.words];

  if (words.length < RACE_QUESTION_COUNT) {
    const extra = await prisma.word.findMany({
      where: {
        moduleId,
        id: { notIn: words.map((w) => w.id) },
      },
      take: RACE_QUESTION_COUNT - words.length,
    });
    words = [...words, ...extra];
  }

  if (words.length < 4) {
    throw new Error('Bu grupta yarış için yeterli kelime yok (en az 4).');
  }

  const selected = shuffle(words).slice(0, RACE_QUESTION_COUNT);
  const pool =
    words.length >= 8
      ? words
      : await prisma.word.findMany({
          where: { moduleId },
          take: 80,
        });

  return selected.map((word) => {
    const wrong = shuffle(
      pool.filter((w) => w.id !== word.id && w.turkish !== word.turkish)
    )
      .slice(0, 3)
      .map((w) => w.turkish);

    while (wrong.length < 3) {
      const alt = selected.find(
        (w) =>
          w.id !== word.id &&
          w.turkish !== word.turkish &&
          !wrong.includes(w.turkish)
      );
      if (!alt) break;
      wrong.push(alt.turkish);
    }

    return {
      id: word.id,
      question: `"${word.english}" kelimesinin Türkçe anlamı nedir?`,
      options: shuffle([...wrong.slice(0, 3), word.turkish]),
      answer: word.turkish,
      wordId: word.id,
    };
  });
}

export function settleRace(a: {
  userId: number;
  correctCount: number;
  durationMs: number;
}, b: {
  userId: number;
  correctCount: number;
  durationMs: number;
}) {
  let winnerId: number | null = null;
  let draw = false;

  if (a.correctCount > b.correctCount) winnerId = a.userId;
  else if (b.correctCount > a.correctCount) winnerId = b.userId;
  else if (a.durationMs < b.durationMs) winnerId = a.userId;
  else if (b.durationMs < a.durationMs) winnerId = b.userId;
  else draw = true;

  const points = (correct: number, won: boolean, isDraw: boolean) =>
    correct * POINTS_PER_CORRECT + (won ? WIN_BONUS : isDraw ? Math.floor(WIN_BONUS / 2) : 0);

  return {
    winnerId,
    draw,
    aWon: winnerId === a.userId,
    bWon: winnerId === b.userId,
    aPoints: points(a.correctCount, winnerId === a.userId, draw),
    bPoints: points(b.correctCount, winnerId === b.userId, draw),
  };
}
