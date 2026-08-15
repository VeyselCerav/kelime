import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/race-session';
import type { RaceQuestion } from '@/lib/race';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const matchId = parseInt(params.id, 10);
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

  const opponentId =
    match.player1Id === auth.userId ? match.player2Id : match.player1Id;
  const [meUser, oppUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, username: true },
    }),
    prisma.user.findUnique({
      where: { id: opponentId },
      select: { id: true, username: true },
    }),
  ]);

  const mine = match.results.find((r) => r.userId === auth.userId) ?? null;
  const theirs = match.results.find((r) => r.userId === opponentId) ?? null;
  const questions = match.questions as RaceQuestion[];

  return NextResponse.json({
    id: match.id,
    status: match.status,
    startedAt: match.startedAt,
    winnerId: match.winnerId,
    questionCount: questions.length,
    questions,
    me: meUser,
    opponent: oppUser,
    myResult: mine,
    opponentResult: theirs,
    bothFinished: Boolean(mine && theirs),
  });
}
