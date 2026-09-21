import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/race-session';
import { buildRaceQuestions, recentRaceWordIds } from '@/lib/race';
import { canAccessModule } from '@/lib/module-access';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const moduleId = parseInt(String(body.moduleId), 10);
  const groupIndex = Math.max(
    1,
    parseInt(String(body.groupIndex || '1'), 10) || 1
  );

  if (!moduleId) {
    return NextResponse.json({ error: 'Modül seçilmeli' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, isAdmin: true },
    });
    const allowed = await canAccessModule({
      moduleId,
      user: user ? { id: user.id, isAdmin: user.isAdmin } : null,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Bu modüle erişim yok' },
        { status: 403 }
      );
    }

    const excludeWordIds = await recentRaceWordIds({
      moduleId,
      userIds: [auth.userId],
    });
    const questions = await buildRaceQuestions(moduleId, groupIndex, {
      excludeWordIds,
    });
    return NextResponse.json(
      { questions },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Soru üretilemedi' },
      { status: 400 }
    );
  }
}
