import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const { searchParams } = new URL(request.url);
    const countParam = searchParams.get('count');

    const learned = await prisma.learnedWord.findMany({
      where: { userId, isLearned: true },
      include: { word: true },
    });

    const learnedWords = learned.map((l) => l.word).filter(Boolean);
    const learnedCount = learnedWords.length;

    // Meta: sadece sayı
    if (countParam === null) {
      return NextResponse.json({
        learnedCount,
        needsChoice: learnedCount >= 20,
        canStart: learnedCount > 0,
      });
    }

    if (learnedCount === 0) {
      return NextResponse.json(
        { error: 'Sınava girmek için önce kelime ezberlemelisin.', learnedCount: 0 },
        { status: 400 }
      );
    }

    const requested = parseInt(countParam, 10);
    let count: number;

    if (learnedCount < 20) {
      count = learnedCount;
    } else if (requested === 20 || requested === 40) {
      count = Math.min(requested, learnedCount);
    } else {
      return NextResponse.json(
        {
          error: 'Soru sayısı seçilmeli (20 veya 40).',
          learnedCount,
          needsChoice: true,
        },
        { status: 400 }
      );
    }

    const pool = await prisma.word.findMany({
      take: 500,
      orderBy: { id: 'asc' },
    });

    const selected = shuffle(learnedWords).slice(0, count);

    const questions = selected.map((word) => {
      const wrong = shuffle(
        pool.filter((w) => w.id !== word.id && w.turkish !== word.turkish)
      )
        .slice(0, 3)
        .map((w) => w.turkish);

      while (wrong.length < 3) {
        const alt = learnedWords.find(
          (w) =>
            w.id !== word.id &&
            w.turkish !== word.turkish &&
            !wrong.includes(w.turkish)
        );
        if (!alt) break;
        wrong.push(alt.turkish);
      }

      return {
        id: word.id,
        question: `"${word.english}" kelimesinin Türkçe anlamı nedir?`,
        options: shuffle([...wrong.slice(0, 3), word.turkish]),
        answer: word.turkish,
        wordId: word.id,
      };
    });

    return NextResponse.json({
      learnedCount,
      questionCount: questions.length,
      questions,
    });
  } catch (error) {
    console.error('Sınav soruları hatası:', error);
    return NextResponse.json({ error: 'Sınav soruları oluşturulamadı' }, { status: 500 });
  }
}
