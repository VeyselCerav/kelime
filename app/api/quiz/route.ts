import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { findWordsForGroup } from '@/lib/module-groups';
import { weightedShuffle } from '@/lib/study-queue';
import { filterUnlearnedOrFallback } from '@/lib/unlearned-filter';
import { authOptions } from '../auth/[...nextauth]/route';
import { IRREGULAR_VERBS_SLUG } from '@/lib/irregular-verbs';
import { isOdevSlug } from '@/lib/odev';
import { prioritizeOdevWords } from '@/lib/odev-coach';
import { canAccessModule } from '@/lib/module-access';
import { buildUniqueOptions } from '@/lib/quiz-options';

export async function GET(request: Request) {
  try {
    await getUserFromToken(request);
    const searchParams = new URL(request.url).searchParams;
    const moduleIdParam = searchParams.get('moduleId') || searchParams.get('week');
    const moduleSlug = searchParams.get('module');
    const groupParam = searchParams.get('group');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    const unlearnedOnly = searchParams.get('unlearned') === '1';

    let moduleId: number | undefined;
    let resolvedSlug: string | null = moduleSlug;
    if (moduleIdParam) {
      moduleId = parseInt(moduleIdParam, 10);
      if (!resolvedSlug && moduleId) {
        const mod = await prisma.module.findUnique({
          where: { id: moduleId },
          select: { slug: true },
        });
        resolvedSlug = mod?.slug ?? null;
      }
    } else if (moduleSlug) {
      const mod = await prisma.module.findUnique({ where: { slug: moduleSlug } });
      if (!mod) {
        return NextResponse.json({ error: 'Modül bulunamadı' }, { status: 404 });
      }
      moduleId = mod.id;
      resolvedSlug = mod.slug;
    }

    const sessionEarly = await getServerSession(authOptions);
    const accessUid = sessionEarly?.user?.id
      ? parseInt(sessionEarly.user.id, 10)
      : null;
    if (moduleId) {
      const allowed = await canAccessModule({
        moduleId,
        user: accessUid
          ? {
              id: accessUid,
              isAdmin: Boolean(sessionEarly?.user?.isAdmin),
            }
          : null,
      });
      if (!allowed) {
        return NextResponse.json({ error: 'Bu modüle erişim yok' }, { status: 403 });
      }
    }

    const isIrregular = resolvedSlug === IRREGULAR_VERBS_SLUG;
    const preserveOrder = isOdevSlug(resolvedSlug);

    let words;
    if (groupParam && moduleId) {
      const groupIndex = Math.max(1, parseInt(groupParam, 10) || 1);
      const result = await findWordsForGroup({
        moduleId,
        groupIndex,
      });
      words = result.words;
    } else {
      words = await prisma.word.findMany({
        where: moduleId ? { moduleId } : undefined,
        orderBy: { id: 'asc' },
      });
    }

    const session = sessionEarly;
    const userId = accessUid;

    if (unlearnedOnly) {
      const filtered = await filterUnlearnedOrFallback(words, userId, true, 4);
      words = filtered.words;
    }

    let learnedSet = new Set<number>();
    if (userId && words.length) {
      const learned = await prisma.learnedWord.findMany({
        where: {
          userId,
          isLearned: true,
          wordId: { in: words.map((w) => w.id) },
        },
        select: { wordId: true },
      });
      learnedSet = new Set(learned.map((l) => l.wordId));
    }
    const withFlags = words.map((w) => ({
      ...w,
      isLearned: learnedSet.has(w.id),
    }));
    words = preserveOrder
      ? [...withFlags].sort((a, b) => a.id - b.id)
      : weightedShuffle(withFlags);

    if (preserveOrder && userId && words.length) {
      const states = await prisma.odevWordState.findMany({
        where: {
          userId,
          wordId: { in: words.map((w) => w.id) },
        },
        select: { wordId: true, dueAt: true, difficultyScore: true },
      });
      if (states.length) {
        words = prioritizeOdevWords(words, states);
      }
    }

    const distractorPool =
      moduleId && words.length < 8
        ? await prisma.word.findMany({
            where: { moduleId },
            orderBy: { id: 'asc' },
            take: 80,
          })
        : words;

    if (words.length < 1) {
      return NextResponse.json(
        { error: 'Bu grupta kelime bulunmuyor.' },
        { status: 400 }
      );
    }

    const pool = distractorPool.length >= 4 ? distractorPool : words;

    if (pool.length < 4 && words.length < 4) {
      return NextResponse.json(
        { error: 'Test için yeterli kelime bulunmuyor. En az 4 kelime gerekli.' },
        { status: 400 }
      );
    }

    const questions = words.map((word) => {
      if (isIrregular && word.pastSimple && word.pastParticiple) {
        const askV2 = Math.random() < 0.5;
        const answer = askV2 ? word.pastSimple : word.pastParticiple;
        const distractors = pool
          .filter((w) => w.id !== word.id)
          .map((w) => (askV2 ? w.pastSimple : w.pastParticiple) || '');
        const options = buildUniqueOptions(answer, distractors, 3, true);

        return {
          id: word.id,
          question: askV2
            ? `"${word.english}" fiilinin past simple (V2) hâli nedir?`
            : `"${word.english}" fiilinin past participle (V3) hâli nedir?`,
          options,
          answer,
          wordId: word.id,
        };
      }

      const distractors = pool
        .filter((w) => w.id !== word.id)
        .map((w) => w.turkish || '');
      const options = buildUniqueOptions(word.turkish, distractors, 3);

      return {
        id: word.id,
        question: `"${word.english}" kelimesinin Türkçe anlamı nedir?`,
        options,
        answer: word.turkish,
        wordId: word.id,
      };
    });

    const orderedQuestions = preserveOrder
      ? questions
      : [...questions].sort(() => Math.random() - 0.5);
    const shuffledQuestions = orderedQuestions.slice(
      0,
      Math.min(limit, orderedQuestions.length)
    );

    return NextResponse.json(shuffledQuestions);
  } catch (error) {
    console.error('Quiz soruları getirme hatası:', error);
    return NextResponse.json(
      { error: 'Sorular yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.' },
      { status: 500 }
    );
  }
}
