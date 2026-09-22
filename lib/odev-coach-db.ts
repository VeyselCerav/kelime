import { prisma } from '@/lib/prisma';
import {
  applyOdevEvent,
  defaultOdevState,
  isOdevEventType,
  type OdevEventType,
  type OdevStateSnapshot,
} from '@/lib/odev-coach';
import { ODEV_SLUG } from '@/lib/odev';

export async function recordOdevEvent(params: {
  userId: number;
  wordId: number;
  type: OdevEventType;
  durationMs?: number | null;
  flipped?: boolean | null;
}): Promise<OdevStateSnapshot | null> {
  const { userId, wordId, type } = params;
  if (!isOdevEventType(type)) return null;

  const word = await prisma.word.findUnique({
    where: { id: wordId },
    select: { id: true, module: { select: { slug: true } } },
  });
  if (!word || word.module.slug !== ODEV_SLUG) return null;

  const durationMs =
    params.durationMs == null
      ? null
      : Math.max(0, Math.min(600_000, Math.round(params.durationMs)));
  const flipped =
    params.flipped === undefined ? null : Boolean(params.flipped);

  await prisma.odevWordEvent.create({
    data: {
      userId,
      wordId,
      type,
      durationMs: durationMs ?? undefined,
      flipped: flipped ?? undefined,
    },
  });

  if (type === 'card_show' || type === 'flip') {
    const existing = await prisma.odevWordState.findUnique({
      where: { userId_wordId: { userId, wordId } },
    });
    if (!existing) {
      const d = defaultOdevState();
      await prisma.odevWordState.create({
        data: {
          userId,
          wordId,
          ...d,
          lastEventAt: new Date(),
        },
      });
      return d;
    }
    await prisma.odevWordState.update({
      where: { id: existing.id },
      data: { lastEventAt: new Date() },
    });
    return {
      difficultyScore: existing.difficultyScore,
      box: existing.box,
      dueAt: existing.dueAt,
      wrongStreak: existing.wrongStreak,
      quizWrong: existing.quizWrong,
      quizCorrect: existing.quizCorrect,
      fastLearnCount: existing.fastLearnCount,
      slowUnlearnCount: existing.slowUnlearnCount,
    };
  }

  const existing = await prisma.odevWordState.findUnique({
    where: { userId_wordId: { userId, wordId } },
  });
  const prev: OdevStateSnapshot = existing
    ? {
        difficultyScore: existing.difficultyScore,
        box: existing.box,
        dueAt: existing.dueAt,
        wrongStreak: existing.wrongStreak,
        quizWrong: existing.quizWrong,
        quizCorrect: existing.quizCorrect,
        fastLearnCount: existing.fastLearnCount,
        slowUnlearnCount: existing.slowUnlearnCount,
      }
    : defaultOdevState();

  const next = applyOdevEvent(prev, { type, durationMs, flipped });

  await prisma.odevWordState.upsert({
    where: { userId_wordId: { userId, wordId } },
    create: {
      userId,
      wordId,
      ...next,
      lastEventAt: new Date(),
    },
    update: {
      ...next,
      lastEventAt: new Date(),
    },
  });

  return next;
}

export async function getOdevCoachStates(userId: number) {
  return prisma.odevWordState.findMany({
    where: { userId },
    select: {
      wordId: true,
      difficultyScore: true,
      box: true,
      dueAt: true,
      wrongStreak: true,
      quizWrong: true,
      quizCorrect: true,
      fastLearnCount: true,
      slowUnlearnCount: true,
    },
  });
}
