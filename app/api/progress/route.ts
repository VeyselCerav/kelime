import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';
import { computeStreakFromDates, evaluateBadges } from '@/lib/badges';

export const dynamic = 'force-dynamic';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date) {
  const x = startOfDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const today = startOfDay(new Date());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);

    const [learnedWordsCount, learnedRows, recentLearned] = await Promise.all([
      prisma.learnedWord.count({
        where: { userId, isLearned: true },
      }),
      prisma.learnedWord.findMany({
        where: { userId, isLearned: true },
        select: { updatedAt: true },
      }),
      prisma.learnedWord.findMany({
        where: {
          userId,
          isLearned: true,
          updatedAt: { gte: weekStart },
        },
        include: {
          word: {
            select: { id: true, english: true, turkish: true, moduleId: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const streak = computeStreakFromDates(learnedRows.map((r) => r.updatedAt));
    const badges = evaluateBadges(learnedWordsCount, streak);

    const weeklyData = Array(7).fill(0) as number[];
    const learnedThisWeek = recentLearned.map((r) => ({
      wordId: r.word.id,
      english: r.word.english,
      turkish: r.word.turkish,
      moduleId: r.word.moduleId,
      updatedAt: r.updatedAt.toISOString(),
      day: dayKey(r.updatedAt),
    }));

    for (const row of recentLearned) {
      const dayIndex = Math.floor(
        (startOfDay(row.updatedAt).getTime() - weekStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (dayIndex >= 0 && dayIndex < 7) {
        weeklyData[dayIndex] += 1;
      }
    }

    const todayKey = dayKey(today);
    const learnedToday = learnedThisWeek.filter((w) => w.day === todayKey);

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
      learnedToday,
      learnedThisWeek,
    });
  } catch (error) {
    console.error('Progress error:', error);
    return NextResponse.json(
      { error: 'İlerleme bilgileri alınamadı' },
      { status: 500 }
    );
  }
}
