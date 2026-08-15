import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/race-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const [agg, wins, recent] = await Promise.all([
    prisma.raceResult.aggregate({
      where: { userId: auth.userId },
      _sum: { points: true },
      _count: true,
    }),
    prisma.raceResult.count({
      where: { userId: auth.userId, won: true },
    }),
    prisma.raceResult.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const opponentIds = [...new Set(recent.map((r) => r.opponentId))];
  const opponents = opponentIds.length
    ? await prisma.user.findMany({
        where: { id: { in: opponentIds } },
        select: { id: true, username: true },
      })
    : [];
  const nameById = new Map(opponents.map((o) => [o.id, o.username]));

  return NextResponse.json({
    wins,
    points: agg._sum.points ?? 0,
    played: agg._count,
    recent: recent.map((r) => ({
      id: r.id,
      opponent: nameById.get(r.opponentId) || 'Rakip',
      correctCount: r.correctCount,
      questionCount: r.questionCount,
      durationMs: r.durationMs,
      won: r.won,
      draw: r.draw,
      points: r.points,
      createdAt: r.createdAt,
    })),
  });
}
