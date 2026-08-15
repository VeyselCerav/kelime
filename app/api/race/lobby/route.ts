import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/race-session';
import { INVITE_TTL_MS, READY_WINDOW_MS } from '@/lib/race';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;
  const userId = auth.userId;
  const now = Date.now();
  const readyAfter = new Date(now - READY_WINDOW_MS);
  const inviteAfter = new Date(now - INVITE_TTL_MS);

  await prisma.raceInvite.updateMany({
    where: { status: 'pending', createdAt: { lt: inviteAfter } },
    data: { status: 'expired' },
  });

  await prisma.raceMatch.updateMany({
    where: {
      status: 'playing',
      startedAt: { lt: new Date(now - 20 * 60 * 1000) },
    },
    data: { status: 'cancelled' },
  });

  const [me, readyRows, incoming, outgoing, active] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    }),
    prisma.racePresence.findMany({
      where: {
        ready: true,
        lastSeen: { gte: readyAfter },
        userId: { not: userId },
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    }),
    prisma.raceInvite.findMany({
      where: { toUserId: userId, status: 'pending' },
      include: { fromUser: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.raceInvite.findMany({
      where: { fromUserId: userId, status: 'pending' },
      include: { toUser: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.raceMatch.findFirst({
      where: {
        status: 'playing',
        startedAt: { gte: new Date(now - 20 * 60 * 1000) },
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const busyIds = new Set<number>();
  const playing = await prisma.raceMatch.findMany({
    where: {
      status: 'playing',
      startedAt: { gte: new Date(now - 20 * 60 * 1000) },
    },
    select: { player1Id: true, player2Id: true },
  });
  for (const m of playing) {
    busyIds.add(m.player1Id);
    busyIds.add(m.player2Id);
  }

  const readyUsers = readyRows
    .filter((r) => !busyIds.has(r.userId))
    .map((r) => ({
      id: r.user.id,
      username: r.user.username,
    }));

  return NextResponse.json({
    me,
    readyUsers,
    incomingInvites: incoming.map((i) => ({
      id: i.id,
      from: i.fromUser,
      createdAt: i.createdAt,
    })),
    outgoingInvites: outgoing.map((i) => ({
      id: i.id,
      to: i.toUser,
      createdAt: i.createdAt,
    })),
    activeMatchId: active?.id ?? null,
  });
}
