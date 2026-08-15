import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/race-session';
import { settleRace } from '@/lib/race';
import type { RaceQuestion } from '@/lib/race';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const matchId = parseInt(params.id, 10);
  const body = await request.json().catch(() => ({}));
  const correctCount = Math.max(0, parseInt(String(body.correctCount), 10) || 0);

  const match = await prisma.raceMatch.findUnique({
    where: { id: matchId },
    include: { results: true },
  });
  if (!match) {
    return NextResponse.json({ error: 'Yarış bulunamadı' }, { status: 404 });
  }
  if (match.player1Id !== auth.userId && match.player2Id !== auth.userId) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const questions = match.questions as RaceQuestion[];
  const qCount = questions.length;
  const safeCorrect = Math.min(correctCount, qCount);
  const durationMs = Math.max(0, Date.now() - match.startedAt.getTime());
  const opponentId =
    match.player1Id === auth.userId ? match.player2Id : match.player1Id;

  const existing = match.results.find((r) => r.userId === auth.userId);
  if (!existing) {
    await prisma.raceResult.create({
      data: {
        matchId,
        userId: auth.userId,
        opponentId,
        correctCount: safeCorrect,
        questionCount: qCount,
        durationMs,
        points: 0,
      },
    });
  }

  const results = await prisma.raceResult.findMany({ where: { matchId } });
  if (results.length < 2) {
    return NextResponse.json({ waiting: true, durationMs });
  }

  if (match.status !== 'finished') {
    const a = results[0];
    const b = results[1];
    const settled = settleRace(
      { userId: a.userId, correctCount: a.correctCount, durationMs: a.durationMs },
      { userId: b.userId, correctCount: b.correctCount, durationMs: b.durationMs }
    );

    await prisma.$transaction([
      prisma.raceMatch.update({
        where: { id: matchId },
        data: { status: 'finished', winnerId: settled.winnerId },
      }),
      prisma.raceResult.update({
        where: { id: a.id },
        data: {
          won: settled.aWon,
          draw: settled.draw,
          points: settled.aPoints,
        },
      }),
      prisma.raceResult.update({
        where: { id: b.id },
        data: {
          won: settled.bWon,
          draw: settled.draw,
          points: settled.bPoints,
        },
      }),
    ]);
  }

  return NextResponse.json({ waiting: false });
}
