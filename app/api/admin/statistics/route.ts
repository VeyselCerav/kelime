import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return new NextResponse(JSON.stringify({ error: 'Yetkisiz erişim' }), {
        status: 403,
      });
    }

    // Genel istatistikleri al
    const [totalUsers, totalWords, totalLearnedWords, totalUnlearnedWords, totalDailyGoals] = await Promise.all([
      prisma.user.count(),
      prisma.word.count(),
      prisma.learnedWord.count(),
      prisma.unlearnedWord.count(),
      prisma.dailyGoal.count(),
    ]);

    // Haftalık kelime istatistiklerini al
    const weeklyStats = await prisma.word.groupBy({
      by: ['week'],
      _count: {
        id: true,
      },
      orderBy: {
        week: 'asc',
      },
    });

    // Haftalık öğrenilen kelime istatistiklerini al
    const weeklyLearnedStats = await prisma.learnedWord.groupBy({
      by: ['createdAt'],
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Haftalık istatistikleri birleştir
    const combinedWeeklyStats = weeklyStats.map((weekStat) => {
      return {
        week: weekStat.week,
        wordCount: weekStat._count.id,
      };
    });

    // Son 7 günün öğrenilen kelime istatistikleri
    const last7DaysStats = weeklyLearnedStats
      .filter(stat => {
        const date = new Date(stat.createdAt);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return date >= sevenDaysAgo;
      })
      .reduce((acc, stat) => acc + stat._count.id, 0);

    return new NextResponse(JSON.stringify({
      totalUsers,
      totalWords,
      totalLearnedWords,
      totalUnlearnedWords,
      totalDailyGoals,
      weeklyStats: combinedWeeklyStats,
      last7DaysLearnedWords: last7DaysStats,
    }), {
      status: 200,
    });
  } catch (error) {
    console.error('İstatistikler alınırken hata:', error);
    return new NextResponse(JSON.stringify({ error: 'Sunucu hatası' }), {
      status: 500,
    });
  }
} 