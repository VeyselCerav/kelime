import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { findWordsForGroup } from '@/lib/module-groups';
import { weightedShuffle } from '@/lib/study-queue';
import { filterUnlearnedOrFallback } from '@/lib/unlearned-filter';
import { authOptions } from '../auth/[...nextauth]/route';
import {
  isTenseAnahtarSlug,
  isTenseGrammarWord,
} from '@/lib/tense-quiz';
import { isOdevSlug } from '@/lib/odev';
import { canAccessModule } from '@/lib/module-access';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const moduleSlug = searchParams.get('module');
    const groupParam = searchParams.get('group');
    const study = searchParams.get('study') === '1';
    const unlearnedOnly = searchParams.get('unlearned') === '1';

    let resolvedModuleId: number | undefined;
    let resolvedSlug: string | null = moduleSlug;

    if (moduleId) {
      resolvedModuleId = parseInt(moduleId, 10);
    } else if (moduleSlug) {
      const mod = await prisma.module.findUnique({ where: { slug: moduleSlug } });
      if (!mod) {
        return NextResponse.json({ error: 'Modül bulunamadı' }, { status: 404 });
      }
      resolvedModuleId = mod.id;
      resolvedSlug = mod.slug;
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? parseInt(session.user.id, 10) : null;
    const accessUser = userId
      ? { id: userId, isAdmin: Boolean(session?.user?.isAdmin) }
      : null;

    if (resolvedModuleId) {
      const allowed = await canAccessModule({
        moduleId: resolvedModuleId,
        user: accessUser,
      });
      if (!allowed) {
        return NextResponse.json({ error: 'Bu modüle erişim yok' }, { status: 403 });
      }
      if (!resolvedSlug) {
        const mod = await prisma.module.findUnique({
          where: { id: resolvedModuleId },
          select: { slug: true },
        });
        resolvedSlug = mod?.slug ?? null;
      }
    }

    const where = resolvedModuleId ? { moduleId: resolvedModuleId } : undefined;

    let words;
    if (groupParam && resolvedModuleId) {
      const groupIndex = Math.max(1, parseInt(groupParam, 10) || 1);
      const result = await findWordsForGroup({
        moduleId: resolvedModuleId,
        groupIndex,
        includeModule: true,
      });
      words = result.words;
    } else {
      words = await prisma.word.findMany({
        where,
        orderBy: { id: 'asc' },
        include: {
          module: { select: { id: true, slug: true, name: true } },
        },
      });
    }

    if (unlearnedOnly) {
      const filtered = await filterUnlearnedOrFallback(words, userId, true, 1);
      words = filtered.words;
    }

    if (study) {
      let learnedSet = new Set<number>();
      if (userId) {
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

      const slug =
        resolvedSlug ??
        (withFlags[0] as { module?: { slug?: string } } | undefined)?.module
          ?.slug ??
        null;

      let ordered;
      if (isOdevSlug(slug)) {
        ordered = [...withFlags].sort((a, b) => a.id - b.id);
      } else if (isTenseAnahtarSlug(slug)) {
        const rules = withFlags.filter((w) =>
          isTenseGrammarWord((w as { addedBy?: string | null }).addedBy)
        );
        const rest = weightedShuffle(
          withFlags.filter(
            (w) =>
              !isTenseGrammarWord((w as { addedBy?: string | null }).addedBy)
          )
        );
        ordered = [...rules, ...rest];
      } else {
        ordered = weightedShuffle(withFlags);
      }
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
    const { english, turkish, moduleId, week, category } = body;
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
        category:
          typeof category === 'string' && category.trim()
            ? category.trim()
            : null,
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
