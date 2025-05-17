import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Kullanıcının öğrendiği kelime sayısını al
    const learnedWordsCount = await prisma.learnedWord.count({
      where: {
        userId,
        isLearned: {
          equals: true
        }
      },
    });

    // Kullanıcının çalışma serisini hesapla
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Son öğrenilen kelimeyi bul
    const lastLearned = await prisma.learnedWord.findFirst({
      where: {
        userId,
        isLearned: {
          equals: true
        }
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    let streak = 0;
    if (lastLearned) {
      const lastLearnedDate = new Date(lastLearned.updatedAt);
      lastLearnedDate.setHours(0, 0, 0, 0);

      if (lastLearnedDate.getTime() === today.getTime()) {
        // Bugün çalışılmış, streak devam ediyor
        const streakStart = await prisma.learnedWord.findFirst({
          where: {
            userId,
            isLearned: true,
            updatedAt: {
              lt: today,
            },
          },
          orderBy: {
            updatedAt: 'asc',
          },
        });

        if (streakStart) {
          const startDate = new Date(streakStart.updatedAt);
          streak = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        } else {
          streak = 1;
        }
      } else if (lastLearnedDate.getTime() === yesterday.getTime()) {
        // Dün çalışılmış, streak devam ediyor
        const streakStart = await prisma.learnedWord.findFirst({
          where: {
            userId,
            isLearned: true,
            updatedAt: {
              lt: yesterday,
            },
          },
          orderBy: {
            updatedAt: 'asc',
          },
        });

        if (streakStart) {
          const startDate = new Date(streakStart.updatedAt);
          streak = Math.floor((yesterday.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        } else {
          streak = 1;
        }
      }
    }

    // Rozetleri hesapla
    const badges = [
      {
        name: 'Başlangıç',
        description: '10 kelime öğren',
        achieved: learnedWordsCount >= 10,
      },
      {
        name: 'Çalışkan Öğrenci',
        description: '50 kelime öğren',
        achieved: learnedWordsCount >= 50,
      },
      {
        name: 'Kelime Ustası',
        description: '100 kelime öğren',
        achieved: learnedWordsCount >= 100,
      },
      {
        name: 'Azimli',
        description: '3 gün üst üste çalış',
        achieved: streak >= 3,
      },
      {
        name: 'Kararlı',
        description: '7 gün üst üste çalış',
        achieved: streak >= 7,
      },
      {
        name: 'Vazgeçmez',
        description: '14 gün üst üste çalış',
        achieved: streak >= 14,
      },
    ];

    // Haftalık ilerlemeyi hesapla
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6); // 6 gün öncesi (bugün dahil 7 gün)

    const weeklyProgress = await prisma.learnedWord.groupBy({
      by: ['updatedAt'],
      where: {
        userId,
        isLearned: {
          equals: true
        },
        updatedAt: {
          gte: weekStart,
          lte: today,
        },
      },
      _count: {
        id: true,
      },
    });

    const weeklyData = Array(7).fill(0);
    weeklyProgress.forEach((day) => {
      const dayIndex = Math.floor(
        (new Date(day.updatedAt).getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (dayIndex >= 0 && dayIndex < 7) {
        weeklyData[dayIndex] = day._count.id;
      }
    });

    return NextResponse.json({
      totalWords: learnedWordsCount,
      streak,
      badges,
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

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const data = await request.json();
    const { totalWords } = data;
    const userId = parseInt(session.user.id);

    const existingProgress = await prisma.userProgress.findFirst({
      where: { userId },
    });

    const now = new Date();
    const lastStudied = existingProgress?.lastStudied || now;
    const daysSinceLastStudy = Math.floor(
      (now.getTime() - new Date(lastStudied).getTime()) / (1000 * 60 * 60 * 24)
    );

    const currentStreak = existingProgress?.streak || 0;
    const newStreak = daysSinceLastStudy <= 1 ? currentStreak + 1 : 1;

    const progress = await prisma.userProgress.upsert({
      where: {
        userId,
      },
      create: {
        userId,
        totalWords,
        streak: newStreak,
        lastStudied: now,
      },
      update: {
        totalWords,
        streak: newStreak,
        lastStudied: now,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Progress API Error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
} 