import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';
import { computeScopeProgress } from '@/lib/group-progress';
import { buildModuleGroups } from '@/lib/module-groups';

export const dynamic = 'force-dynamic';

/** GET /api/progress/groups?moduleId= — tüm alt grupların ilerlemesi */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const moduleId = parseInt(searchParams.get('moduleId') || '', 10);
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
        select: { id: true, english: true, category: true },
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
    const meta = buildModuleGroups({
      words,
      moduleName: mod.name,
      moduleSlug: mod.slug,
    });

    const groups = meta.groups.map((g) => {
      const scope = computeScopeProgress({
        moduleId,
        moduleName: mod.name,
        moduleSlug: mod.slug,
        groupIndex: g.index,
        words,
        learnedIdSet,
      });
      return {
        index: g.index,
        label: g.label,
        start: g.start,
        end: g.end,
        count: g.count,
        learned: scope.learned,
        total: scope.total,
        percentage: scope.percentage,
        complete: scope.complete,
      };
    });

    return NextResponse.json({
      moduleId,
      groupMode: meta.groupMode,
      groups,
    });
  } catch (error) {
    console.error('Grup ilerleme hatası:', error);
    return NextResponse.json({ error: 'İlerleme alınamadı' }, { status: 500 });
  }
}
