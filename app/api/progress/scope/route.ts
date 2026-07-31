import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';
import { computeScopeProgress } from '@/lib/group-progress';

/** GET /api/progress/scope?moduleId=&group= */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const moduleId = parseInt(searchParams.get('moduleId') || '', 10);
    const groupIndex = Math.max(1, parseInt(searchParams.get('group') || '1', 10) || 1);

    if (!moduleId || Number.isNaN(moduleId)) {
      return NextResponse.json({ error: 'moduleId zorunlu' }, { status: 400 });
    }

    const userId = parseInt(session.user.id, 10);

    const mod = await prisma.module.findUnique({ where: { id: moduleId } });
    if (!mod) {
      return NextResponse.json({ error: 'Modül bulunamadı' }, { status: 404 });
    }

    const [words, learnedRows] = await Promise.all([
      prisma.word.findMany({
        where: { moduleId },
        orderBy: { id: 'asc' },
        select: { id: true },
      }),
      prisma.learnedWord.findMany({
        where: {
          userId,
          isLearned: true,
          word: { moduleId },
        },
        select: { wordId: true },
      }),
    ]);

    const learnedIdSet = new Set(learnedRows.map((r) => r.wordId));
    const scope = computeScopeProgress({
      moduleId,
      moduleName: mod.name,
      moduleSlug: mod.slug,
      groupIndex,
      wordIdsAsc: words.map((w) => w.id),
      learnedIdSet,
    });

    // Modül geneli özet
    const moduleLearned = words.filter((w) => learnedIdSet.has(w.id)).length;

    return NextResponse.json({
      ...scope,
      moduleTotal: words.length,
      moduleLearned,
      modulePercentage:
        words.length === 0
          ? 0
          : Math.round((moduleLearned / words.length) * 100),
    });
  } catch (error) {
    console.error('Scope progress hatası:', error);
    return NextResponse.json({ error: 'İlerleme alınamadı' }, { status: 500 });
  }
}
