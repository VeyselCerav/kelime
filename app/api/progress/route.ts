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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);

    const weeklyProgress = await prisma.learnedWord.groupBy({
      by: ['updatedAt'],
      where: {
        userId,
        isLearned: true,
        updatedAt: { gte: weekStart },
      },
      _count: { id: true },
    });

    const weeklyData = Array(7).fill(0);
    weeklyProgress.forEach((day) => {
      const dayIndex = Math.floor(
        (new Date(day.updatedAt).getTime() - weekStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (dayIndex >= 0 && dayIndex < 7) {
        weeklyData[dayIndex] = day._count.id;
      }
    });

    return NextResponse.json({
      totalWords: learnedWordsCount,
      learnedWordsCount,
      streak,
      badges: badges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        achieved: b.earned,
        icon: b.icon,
        type: b.type,
        requirement: b.requirement,
        progress: b.progress,
        percentage: b.percentage,
        accent: b.accent,
      })),
      weeklyData,
    });
  } catch (error) {
    console.error('Progress error:', error);
    return NextResponse.json(
      { error: 'İlerleme bilgileri alınamadı' },
      { status: 500 }
    );
  }
}
