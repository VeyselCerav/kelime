import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/race-session';

export const dynamic = 'force-dynamic';

/** POST { ready, moduleId, groupIndex } */
export async function POST(request: Request) {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const ready = body.ready !== false;
  const moduleId = body.moduleId ? parseInt(String(body.moduleId), 10) : null;
  const groupIndex = Math.max(1, parseInt(String(body.groupIndex || '1'), 10) || 1);

  await prisma.racePresence.upsert({
    where: { userId: auth.userId },
    create: {
      userId: auth.userId,
      ready,
      lastSeen: new Date(),
      moduleId: Number.isFinite(moduleId) ? moduleId : null,
      groupIndex,
    },
    update: {
      ready,
      lastSeen: new Date(),
      moduleId: Number.isFinite(moduleId) ? moduleId : null,
      groupIndex,
    },
  });

  return NextResponse.json({ ok: true });
}
