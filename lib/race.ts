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

function normalizeEnglish(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9çğıöşü]+/gi, '');
}

function groupByLetter<T extends { id: number; english: string }>(words: T[]) {
  const map = new Map<string, T[]>();
  for (const w of words) {
    const L = wordLetter(w.english);
    const list = map.get(L) ?? [];
    list.push(w);
    map.set(L, list);
  }
  return map;
}

/** Aynı harfle başlayan, doğru cevaptan farklı 2 yanlış + 1 doğru = 3 şık */
function buildSameLetterOptions<T extends { id: number; english: string }>(
  word: T,
  byLetter: Map<string, T[]>,
  fallbackPool: T[]
): string[] {
  const letter = wordLetter(word.english);
  const correctNorm = normalizeEnglish(word.english);
  const seen = new Set<string>([correctNorm]);

  const pickWrong = (pool: T[]) => {
    const out: string[] = [];
    for (const w of shuffle(pool)) {
      if (w.id === word.id) continue;
      if (wordLetter(w.english) !== letter) continue;
      const n = normalizeEnglish(w.english);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(w.english.trim());
      if (out.length >= 2) break;
    }
    return out;
  };

  let wrong = pickWrong(byLetter.get(letter) ?? []);
  if (wrong.length < 2) {
    wrong = [
      ...wrong,
      ...pickWrong(fallbackPool).filter((e) => !wrong.includes(e)),
    ].slice(0, 2);
  }

  // Hâlâ eksikse (çok nadir harf): harf şartını gevşetme — mümkün olan kadar aynı harf
  const options = shuffle([word.english.trim(), ...wrong]);
  // Tek doğru: normalize ile yalnızca bir kez doğru kelime
  const unique: string[] = [];
  const seenOpt = new Set<string>();
  for (const opt of options) {
    const n = normalizeEnglish(opt);
    if (!n || seenOpt.has(n)) continue;
    seenOpt.add(n);
    unique.push(opt);
  }
  // Doğru cevabın listede olduğundan emin ol
  if (!unique.some((o) => normalizeEnglish(o) === correctNorm)) {
    unique.unshift(word.english.trim());
  }
  // Doğru dışındakilerden fazla doğru varyant temizle
  const correctOnes = unique.filter(
    (o) => normalizeEnglish(o) === correctNorm
  );
  const others = unique.filter((o) => normalizeEnglish(o) !== correctNorm);
  return shuffle([correctOnes[0], ...others]).slice(0, 3);
}

export async function buildRaceQuestions(
  moduleId: number,
  groupIndex: number,
  options?: { excludeWordIds?: number[] }
): Promise<RaceQuestion[]> {
  const group = await findWordsForGroup({ moduleId, groupIndex });
  const all = await prisma.word.findMany({ where: { moduleId } });
  const byLetter = groupByLetter(all);

  // Aynı harften en az 3 kelime olanlar tercih (3 şık için)
  const eligible = all.filter(
    (w) => (byLetter.get(wordLetter(w.english))?.length ?? 0) >= 3
  );
  const pickFrom = eligible.length >= 8 ? eligible : all;

  let words = pickRaceWords(
    pickFrom,
    group.words.filter((w) =>
      pickFrom.some((p) => p.id === w.id)
    ),
    options?.excludeWordIds ?? [],
    RACE_QUESTION_COUNT
  );

  if (words.length < RACE_QUESTION_COUNT) {
    const extra = pickFrom.filter((w) => !words.some((x) => x.id === w.id));
    words = [...words, ...shuffle(extra)].slice(0, RACE_QUESTION_COUNT);
  }

  if (words.length < RACE_QUESTION_COUNT) {
    const more = await prisma.word.findMany({
      where: { id: { notIn: words.map((w) => w.id) } },
      take: RACE_QUESTION_COUNT - words.length,
    });
    words = [...words, ...more];
  }

  if (words.length < 4) {
    throw new Error('Bu grupta yarış için yeterli kelime yok (en az 4).');
  }

  const selected = words.slice(0, RACE_QUESTION_COUNT);

  // Nadir harfler için tüm kelime bankasından aynı harfli şıklar
  let optionPool = all;
  const shortLetters = [
    ...new Set(selected.map((w) => wordLetter(w.english))),
  ].filter((L) => (byLetter.get(L)?.length ?? 0) < 3);
  if (shortLetters.length > 0) {
    const extra = await prisma.word.findMany();
    optionPool = extra;
  }
  const optionByLetter = groupByLetter(optionPool);

  return selected.map((word) => {
    const letter = wordLetter(word.english);
    const opts = buildSameLetterOptions(
      word,
      optionByLetter,
      optionByLetter.get(letter) ?? []
    );

    return {
      id: word.id,
      question: `“${word.turkish}” anlamına gelen kelime hangisi?`,
      options: opts,
      answer: word.english,
      wordId: word.id,
      english: word.english,
      turkish: word.turkish,
      letter,
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
