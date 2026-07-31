import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';
import { computeStreakFromDates, evaluateBadges } from '@/lib/badges';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    const [learnedWordsCount, learnedRows] = await Promise.all([
      prisma.learnedWord.count({
        where: { userId, isLearned: true },
      }),
      prisma.learnedWord.findMany({
        where: { userId, isLearned: true },
        select: { updatedAt: true },
      }),
    ]);

    const streak = computeStreakFromDates(learnedRows.map((r) => r.updatedAt));
    const badges = evaluateBadges(learnedWordsCount, streak);

    return NextResponse.json({
      learnedWordsCount,
      streak,
      badges,
      earnedCount: badges.filter((b) => b.earned).length,
      totalCount: badges.length,
    });
  } catch (error) {
    console.error('Rozet getirme hatası:', error);
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
  }
}
