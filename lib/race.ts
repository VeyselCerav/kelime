import { prisma } from '@/lib/prisma';
import { findWordsForGroup } from '@/lib/module-groups';

export const RACE_QUESTION_COUNT = 20;
export const READY_WINDOW_MS = 45000;
export const INVITE_TTL_MS = 90000;
export const RACE_TIMER_MS = 120_000;
export const WIN_BONUS = 25;
export const POINTS_PER_CORRECT = 2;

export type RaceQuestion = {
  id: number;
  question: string;
  options: string[];
  answer: string;
  wordId: number;
  english: string;
  turkish: string;
  letter: string;
};

export function wordLetter(english: string): string {
  const ch = english.trim().match(/[A-Za-z]/);
  return (ch ? ch[0] : english.trim().charAt(0) || '?').toUpperCase();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function recentRaceWordIds(params: {
  moduleId: number;
  userIds: number[];
  takeMatches?: number;
}): Promise<number[]> {
  const userIds = [...new Set(params.userIds.filter((id) => Number.isFinite(id)))];
  if (!userIds.length) return [];

  const matches = await prisma.raceMatch.findMany({
    where: {
      moduleId: params.moduleId,
      OR: [
        { player1Id: { in: userIds } },
        { player2Id: { in: userIds } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: params.takeMatches ?? 5,
    select: { questions: true },
  });

  const ids: number[] = [];
  const seen = new Set<number>();
  for (const match of matches) {
    const questions = match.questions as RaceQuestion[];
    for (const q of questions) {
      const id = Number(q.wordId || q.id);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function pickRaceWords<T extends { id: number }>(
  all: T[],
  groupWords: T[],
  excludeIds: number[],
  count: number
): T[] {
  const exclude = new Set(excludeIds);
  const groupSet = new Set(groupWords.map((w) => w.id));
  const unused = shuffle(all.filter((w) => !exclude.has(w.id)));
  const unusedGroup = unused.filter((w) => groupSet.has(w.id));
  const unusedRest = unused.filter((w) => !groupSet.has(w.id));
  const picked: T[] = [];
  const seen = new Set<number>();

  const take = (list: T[]) => {
    for (const word of list) {
      if (picked.length >= count) return;
      if (seen.has(word.id)) continue;
      seen.add(word.id);
      picked.push(word);
    }
  };

  take(unusedGroup.slice(0, Math.min(8, count)));
  take(unusedRest);
  take(unusedGroup);
  take(shuffle(all));
  return picked.slice(0, count);
}

export async function buildRaceQuestions(
  moduleId: number,
  groupIndex: number,
  options?: { excludeWordIds?: number[] }
): Promise<RaceQuestion[]> {
  const group = await findWordsForGroup({ moduleId, groupIndex });
  const all = await prisma.word.findMany({ where: { moduleId } });
  let words = pickRaceWords(
    all,
    group.words,
    options?.excludeWordIds ?? [],
    RACE_QUESTION_COUNT
  );

  if (words.length < RACE_QUESTION_COUNT) {
    const extra = await prisma.word.findMany({
      where: {
        id: { notIn: words.map((w) => w.id) },
      },
      take: RACE_QUESTION_COUNT - words.length,
    });
    words = [...words, ...extra];
  }

  if (words.length < 4) {
    throw new Error('Bu grupta yarış için yeterli kelime yok (en az 4).');
  }

  const selected = words.slice(0, RACE_QUESTION_COUNT);
  const distractorPool = await prisma.word.findMany({
    where: { moduleId },
    take: 120,
  });
  const pool = distractorPool.length >= 8 ? distractorPool : words;

  return selected.map((word) => {
    const wrongEn = shuffle(
      pool.filter((w) => w.id !== word.id && w.english !== word.english)
    )
      .slice(0, 2)
      .map((w) => w.english);

    while (wrongEn.length < 2) {
      const alt = selected.find(
        (w) =>
          w.id !== word.id &&
          w.english !== word.english &&
          !wrongEn.includes(w.english)
      );
      if (!alt) break;
      wrongEn.push(alt.english);
    }

    return {
      id: word.id,
      question: `“${word.turkish}” anlamına gelen kelime hangisi?`,
      options: shuffle([...wrongEn.slice(0, 2), word.english]),
      answer: word.english,
      wordId: word.id,
      english: word.english,
      turkish: word.turkish,
      letter: wordLetter(word.english),
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
