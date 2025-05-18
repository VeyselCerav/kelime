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
    const [totalUsers, totalWords, totalQuizzes, totalPractices] = await Promise.all([
      prisma.user.count(),
      prisma.word.count(),
      prisma.quiz.count(),
      prisma.practice.count(),
    ]);

    // Haftalık istatistikleri al
    const weeklyStats = await prisma.word.groupBy({
      by: ['week'],
      _count: {
        id: true,
      },
      orderBy: {
        week: 'asc',
      },
    });

    // Quiz istatistiklerini haftalara göre grupla
    const weeklyQuizStats = await prisma.quiz.groupBy({
      by: ['week'],
      _count: {
        id: true,
      },
      orderBy: {
        week: 'asc',
      },
    });

    // Haftalık istatistikleri birleştir
    const combinedWeeklyStats = weeklyStats.map((weekStat) => {
      const quizStat = weeklyQuizStats.find((q) => q.week === weekStat.week);
      return {
        week: weekStat.week,
        wordCount: weekStat._count.id,
        quizCount: quizStat ? quizStat._count.id : 0,
      };
    });

    return new NextResponse(JSON.stringify({
      totalUsers,
      totalWords,
      totalQuizzes,
      totalPractices,
      weeklyStats: combinedWeeklyStats,
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