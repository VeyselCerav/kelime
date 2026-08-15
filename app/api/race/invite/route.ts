import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/race-session';
import { READY_WINDOW_MS } from '@/lib/race';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const toUserId = parseInt(String(body.toUserId), 10);
  const moduleId = parseInt(String(body.moduleId), 10);
  const groupIndex = Math.max(1, parseInt(String(body.groupIndex || '1'), 10) || 1);

  if (!toUserId || toUserId === auth.userId) {
    return NextResponse.json({ error: 'Geçersiz rakip' }, { status: 400 });
  }
  if (!moduleId) {
    return NextResponse.json({ error: 'Modül seçilmeli' }, { status: 400 });
  }

  const presence = await prisma.racePresence.findUnique({
    where: { userId: toUserId },
  });
  const online =
    presence?.ready &&
    Date.now() - presence.lastSeen.getTime() < READY_WINDOW_MS;
  if (!online) {
    return NextResponse.json(
      { error: 'Bu kullanıcı artık hazır değil.' },
      { status: 409 }
    );
  }

  const existing = await prisma.raceInvite.findFirst({
    where: {
      status: 'pending',
      OR: [
        { fromUserId: auth.userId, toUserId },
        { fromUserId: toUserId, toUserId: auth.userId },
      ],
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'Bu oyuncuyla zaten bekleyen bir davet var.' },
      { status: 409 }
    );
  }

  const inMatch = await prisma.raceMatch.findFirst({
    where: {
      status: 'playing',
      OR: [
        { player1Id: auth.userId },
        { player2Id: auth.userId },
        { player1Id: toUserId },
        { player2Id: toUserId },
      ],
    },
  });
  if (inMatch) {
    return NextResponse.json(
      { error: 'Oyuncılardan biri zaten yarışta.' },
      { status: 409 }
    );
  }

  const invite = await prisma.raceInvite.create({
    data: {
      fromUserId: auth.userId,
      toUserId,
      moduleId,
      groupIndex,
      status: 'pending',
    },
  });

  return NextResponse.json({ inviteId: invite.id });
}
