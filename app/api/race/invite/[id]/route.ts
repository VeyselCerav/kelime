import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/race-session';
import { buildRaceQuestions, INVITE_TTL_MS } from '@/lib/race';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const inviteId = parseInt(params.id, 10);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || '');

  const invite = await prisma.raceInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.status !== 'pending') {
    return NextResponse.json({ error: 'Davet bulunamadı' }, { status: 404 });
  }

  if (Date.now() - invite.createdAt.getTime() > INVITE_TTL_MS) {
    await prisma.raceInvite.update({
      where: { id: inviteId },
      data: { status: 'expired' },
    });
    return NextResponse.json({ error: 'Davetin süresi doldu' }, { status: 410 });
  }

  if (action === 'cancel') {
    if (invite.fromUserId !== auth.userId) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    await prisma.raceInvite.update({
      where: { id: inviteId },
      data: { status: 'cancelled' },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === 'decline') {
    if (invite.toUserId !== auth.userId) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    await prisma.raceInvite.update({
      where: { id: inviteId },
      data: { status: 'declined' },
    });
    return NextResponse.json({ ok: true });
  }

  if (action !== 'accept') {
    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
  }
  if (invite.toUserId !== auth.userId) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  let questions;
  try {
    questions = await buildRaceQuestions(invite.moduleId, invite.groupIndex);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Soru üretilemedi' },
      { status: 400 }
    );
  }

  const match = await prisma.raceMatch.create({
    data: {
      player1Id: invite.fromUserId,
      player2Id: invite.toUserId,
      moduleId: invite.moduleId,
      groupIndex: invite.groupIndex,
      questions,
      status: 'playing',
    },
  });

  await prisma.raceInvite.update({
    where: { id: inviteId },
    data: { status: 'accepted', matchId: match.id },
  });

  await prisma.raceInvite.updateMany({
    where: {
      status: 'pending',
      id: { not: inviteId },
      OR: [
        { fromUserId: invite.fromUserId },
        { toUserId: invite.fromUserId },
        { fromUserId: invite.toUserId },
        { toUserId: invite.toUserId },
      ],
    },
    data: { status: 'cancelled' },
  });

  return NextResponse.json({ matchId: match.id });
}
