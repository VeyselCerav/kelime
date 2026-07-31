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

    const [
      totalUsers,
      totalWords,
      totalLearnedWords,
      totalUnlearnedWords,
      totalDailyGoals,
      moduleStats,
      weeklyLearnedStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.word.count(),
      prisma.learnedWord.count(),
      prisma.unlearnedWord.count(),
      prisma.dailyGoal.count(),
      prisma.word.groupBy({
        by: ['moduleId'],
        _count: { id: true },
        orderBy: { moduleId: 'asc' },
      }),
      prisma.learnedWord.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const modules = await prisma.module.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const moduleMap = Object.fromEntries(modules.map((m) => [m.id, m]));

    const combinedModuleStats = moduleStats.map((stat) => ({
      moduleId: stat.moduleId,
      moduleName: moduleMap[stat.moduleId]?.name || `Modül ${stat.moduleId}`,
      wordCount: stat._count.id,
    }));

    const last7DaysStats = weeklyLearnedStats
      .filter((stat) => {
        const date = new Date(stat.createdAt);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return date >= sevenDaysAgo;
      })
      .reduce((acc, stat) => acc + stat._count.id, 0);

    return new NextResponse(
      JSON.stringify({
        totalUsers,
        totalWords,
        totalLearnedWords,
        totalUnlearnedWords,
        totalDailyGoals,
        moduleStats: combinedModuleStats,
        weeklyStats: combinedModuleStats.map((m) => ({
          week: m.moduleId,
          wordCount: m.wordCount,
          label: m.moduleName,
        })),
        last7DaysLearnedWords: last7DaysStats,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('İstatistikler alınırken hata:', error);
    return new NextResponse(JSON.stringify({ error: 'Sunucu hatası' }), {
      status: 500,
    });
  }
}
