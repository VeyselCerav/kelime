import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/race-session';
import { prisma } from '@/lib/prisma';
import { ODEV_SLUG } from '@/lib/odev';
import { canAccessModule } from '@/lib/module-access';
import {
  isOdevEventType,
  isOdevHardCandidate,
  compareOdevCoachPriority,
} from '@/lib/odev-coach';
import { recordOdevEvent } from '@/lib/odev-coach-db';

export const dynamic = 'force-dynamic';

async function requireOdevAccess(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true },
  });
  if (!user) return { error: NextResponse.json({ error: 'Kullanıcı yok' }, { status: 401 }) };

  const mod = await prisma.module.findUnique({
    where: { slug: ODEV_SLUG },
    select: { id: true, isRestricted: true },
  });
  if (!mod) {
    return { error: NextResponse.json({ error: 'Ödev modülü yok' }, { status: 404 }) };
  }

  const ok = await canAccessModule({
    moduleId: mod.id,
    user,
    isRestricted: mod.isRestricted,
  });
  if (!ok) {
    return { error: NextResponse.json({ error: 'Ödev erişimi yok' }, { status: 403 }) };
  }
  return { user, moduleId: mod.id };
}

/** GET — due / hard kelimeler + özet */
export async function GET(request: Request) {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const access = await requireOdevAccess(auth.userId);
  if ('error' in access) return access.error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10)
  );
  const mode = searchParams.get('mode') || 'due';

  const now = new Date();
  const states = await prisma.odevWordState.findMany({
    where: {
      userId: auth.userId,
      word: { moduleId: access.moduleId },
    },
    include: {
      word: {
        select: {
          id: true,
          english: true,
          turkish: true,
          category: true,
          imageUrl: true,
          moduleId: true,
        },
      },
    },
  });

  const filtered = states.filter((s) => {
    const snap = {
      difficultyScore: s.difficultyScore,
      box: s.box,
      dueAt: s.dueAt,
      wrongStreak: s.wrongStreak,
      quizWrong: s.quizWrong,
      quizCorrect: s.quizCorrect,
      fastLearnCount: s.fastLearnCount,
      slowUnlearnCount: s.slowUnlearnCount,
    };
    if (mode === 'all-hard') return isOdevHardCandidate(snap, now);
    // due: vadesi gelmiş veya skor yüksek
    return s.dueAt.getTime() <= now.getTime() || s.difficultyScore >= 20;
  });

  filtered.sort((a, b) =>
    compareOdevCoachPriority(
      {
        dueAt: a.dueAt,
        difficultyScore: a.difficultyScore,
        wordId: a.wordId,
      },
      {
        dueAt: b.dueAt,
        difficultyScore: b.difficultyScore,
        wordId: b.wordId,
      },
      now
    )
  );

  const slice = filtered.slice(0, limit);

  return NextResponse.json({
    mode,
    now: now.toISOString(),
    dueCount: states.filter((s) => s.dueAt.getTime() <= now.getTime()).length,
    hardCount: states.filter((s) =>
      isOdevHardCandidate(
        {
          difficultyScore: s.difficultyScore,
          box: s.box,
          dueAt: s.dueAt,
          wrongStreak: s.wrongStreak,
          quizWrong: s.quizWrong,
          quizCorrect: s.quizCorrect,
          fastLearnCount: s.fastLearnCount,
          slowUnlearnCount: s.slowUnlearnCount,
        },
        now
      )
    ).length,
    words: slice.map((s) => ({
      ...s.word,
      coach: {
        difficultyScore: s.difficultyScore,
        box: s.box,
        dueAt: s.dueAt,
        wrongStreak: s.wrongStreak,
        quizWrong: s.quizWrong,
        quizCorrect: s.quizCorrect,
        fastLearnCount: s.fastLearnCount,
        slowUnlearnCount: s.slowUnlearnCount,
      },
    })),
  });
}

/** POST — tek veya toplu event */
export async function POST(request: Request) {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const access = await requireOdevAccess(auth.userId);
  if ('error' in access) return access.error;

  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body.events)
    ? body.events
    : body.type
      ? [body]
      : [];

  if (!items.length) {
    return NextResponse.json({ error: 'Event yok' }, { status: 400 });
  }

  const results = [];
  for (const item of items.slice(0, 40)) {
    const wordId = parseInt(String(item.wordId), 10);
    const type = String(item.type || '');
    if (!wordId || !isOdevEventType(type)) continue;
    const state = await recordOdevEvent({
      userId: auth.userId,
      wordId,
      type,
      durationMs: item.durationMs,
      flipped: item.flipped,
    });
    if (state) results.push({ wordId, type, state });
  }

  return NextResponse.json({ ok: true, recorded: results.length, results });
}
