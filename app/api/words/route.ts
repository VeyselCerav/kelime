import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { groupPagination } from '@/lib/subgroups';
import { weightedShuffle } from '@/lib/study-queue';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const moduleSlug = searchParams.get('module');
    const groupParam = searchParams.get('group');
    const study = searchParams.get('study') === '1';

    let resolvedModuleId: number | undefined;

    if (moduleId) {
      resolvedModuleId = parseInt(moduleId, 10);
    } else if (moduleSlug) {
      const mod = await prisma.module.findUnique({ where: { slug: moduleSlug } });
      if (!mod) {
        return NextResponse.json({ error: 'Modül bulunamadı' }, { status: 404 });
      }
      resolvedModuleId = mod.id;
    }

    const where = resolvedModuleId ? { moduleId: resolvedModuleId } : undefined;

    let words;
    if (groupParam && resolvedModuleId) {
      const groupIndex = Math.max(1, parseInt(groupParam, 10) || 1);
      const { skip, take } = groupPagination(groupIndex);
      words = await prisma.word.findMany({
        where,
        orderBy: { id: 'asc' },
        skip,
        take,
        include: {
          module: { select: { id: true, slug: true, name: true } },
        },
      });
    } else {
      words = await prisma.word.findMany({
        where,
        orderBy: { id: 'asc' },
        include: {
          module: { select: { id: true, slug: true, name: true } },
        },
      });
    }

    // Çalışma modu: öğrenme durumu + ağırlıklı sıra
    if (study) {
      const session = await getServerSession(authOptions);
      let learnedSet = new Set<number>();
      if (session?.user?.id) {
        const userId = parseInt(session.user.id, 10);
        const ids = words.map((w) => w.id);
        if (ids.length) {
          const learned = await prisma.learnedWord.findMany({
            where: {
              userId,
              isLearned: true,
              wordId: { in: ids },
            },
            select: { wordId: true },
          });
          learnedSet = new Set(learned.map((l) => l.wordId));
        }
      }

      const withFlags = words.map((w) => ({
        ...w,
        isLearned: learnedSet.has(w.id),
      }));
      const ordered = weightedShuffle(withFlags);
      return NextResponse.json(ordered);
    }

    return NextResponse.json(words);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Kelimeler getirilirken hata:', error);
    return NextResponse.json(
      { error: 'Kelimeler getirilirken bir hata oluştu: ' + message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { english, turkish, moduleId, week } = body;
    const resolvedModuleId = moduleId ?? week;

    if (!english || !turkish || !resolvedModuleId) {
      return NextResponse.json(
        { error: 'İngilizce, Türkçe ve modül bilgisi gereklidir' },
        { status: 400 }
      );
    }

    const word = await prisma.word.create({
      data: {
        english: String(english).trim(),
        turkish: String(turkish).trim(),
        moduleId: parseInt(String(resolvedModuleId), 10),
        addedBy: body.addedBy || 'api',
      },
    });

    return NextResponse.json(word);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Kelime ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Kelime eklenirken bir hata oluştu: ' + message },
      { status: 500 }
    );
  }
}
