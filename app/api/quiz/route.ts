import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { groupPagination } from '@/lib/subgroups';
import { weightedShuffle } from '@/lib/study-queue';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    await getUserFromToken(request);
    const searchParams = new URL(request.url).searchParams;
    const moduleIdParam = searchParams.get('moduleId') || searchParams.get('week');
    const moduleSlug = searchParams.get('module');
    const groupParam = searchParams.get('group');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

    let moduleId: number | undefined;
    if (moduleIdParam) {
      moduleId = parseInt(moduleIdParam, 10);
    } else if (moduleSlug) {
      const mod = await prisma.module.findUnique({ where: { slug: moduleSlug } });
      if (!mod) {
        return NextResponse.json({ error: 'Modül bulunamadı' }, { status: 404 });
      }
      moduleId = mod.id;
    }

    let words;
    if (groupParam && moduleId) {
      const groupIndex = Math.max(1, parseInt(groupParam, 10) || 1);
      const { skip, take } = groupPagination(groupIndex);
      words = await prisma.word.findMany({
        where: { moduleId },
        orderBy: { id: 'asc' },
        skip,
        take,
      });
    } else {
      words = await prisma.word.findMany({
        where: moduleId ? { moduleId } : undefined,
        orderBy: { id: 'asc' },
      });
    }

    // Ağırlıklı sıra: ezberlenmeyen ×3
    const session = await getServerSession(authOptions);
    let learnedSet = new Set<number>();
    if (session?.user?.id && words.length) {
      const userId = parseInt(session.user.id, 10);
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
    words = weightedShuffle(
      words.map((w) => ({ ...w, isLearned: learnedSet.has(w.id) }))
    );

    // Çeldiriciler için aynı modülden ek kelimeler
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
      const otherWords = pool.filter((w) => w.id !== word.id);
      const wrongAnswers = [...otherWords]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.turkish);

      while (wrongAnswers.length < 3 && otherWords.length > wrongAnswers.length) {
        const extra = otherWords.find((w) => !wrongAnswers.includes(w.turkish));
        if (!extra) break;
        wrongAnswers.push(extra.turkish);
      }

      const options = [...wrongAnswers.slice(0, 3), word.turkish].sort(
        () => Math.random() - 0.5
      );

      return {
        id: word.id,
        question: `"${word.english}" kelimesinin Türkçe anlamı nedir?`,
        options,
        answer: word.turkish,
        wordId: word.id,
      };
    });

    const shuffledQuestions = [...questions]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(limit, questions.length));

    return NextResponse.json(shuffledQuestions);
  } catch (error) {
    console.error('Quiz soruları getirme hatası:', error);
    return NextResponse.json(
      { error: 'Sorular yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.' },
      { status: 500 }
    );
  }
}
