import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/race-session';
import { prisma } from '@/lib/prisma';
import { userCanReceiveOdevPush } from '@/lib/web-push';

export const dynamic = 'force-dynamic';

type Body = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  userAgent?: string;
};

export async function GET() {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const eligible = await userCanReceiveOdevPush(auth.userId);
  if (!eligible) {
    return NextResponse.json({ eligible: false, subscribed: false });
  }

  const count = await prisma.pushSubscription.count({
    where: { userId: auth.userId },
  });

  return NextResponse.json({
    eligible: true,
    subscribed: count > 0,
  });
}

export async function POST(request: Request) {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const eligible = await userCanReceiveOdevPush(auth.userId);
  if (!eligible) {
    return NextResponse.json(
      { error: 'Ödev bildirimi için yetkiniz yok' },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const authKey = body.keys?.auth?.trim();

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json(
      { error: 'Geçersiz abonelik verisi' },
      { status: 400 }
    );
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: auth.userId,
      endpoint,
      p256dh,
      auth: authKey,
      userAgent: body.userAgent?.slice(0, 500) || null,
    },
    update: {
      userId: auth.userId,
      p256dh,
      auth: authKey,
      userAgent: body.userAgent?.slice(0, 500) || null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
  const endpoint = body.endpoint?.trim();

  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { userId: auth.userId, endpoint },
    });
  } else {
    await prisma.pushSubscription.deleteMany({
      where: { userId: auth.userId },
    });
  }

  return NextResponse.json({ ok: true });
}
