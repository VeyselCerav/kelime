import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';
import {
  badgesFromCompletedGroups,
  computeStreakFromDates,
  evaluateBadges,
} from '@/lib/badges';
import { findCompletedGroups } from '@/lib/group-progress';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    const [learnedWordsCount, learnedRows, modules, learnedWordIds] =
      await Promise.all([
        prisma.learnedWord.count({
          where: { userId, isLearned: true },
        }),
        prisma.learnedWord.findMany({
          where: { userId, isLearned: true },
          select: { updatedAt: true },
        }),
        prisma.module.findMany({
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            slug: true,
            name: true,
            words: {
              select: { id: true, english: true, category: true },
              orderBy: { id: 'asc' },
            },
          },
        }),
        prisma.learnedWord.findMany({
          where: { userId, isLearned: true },
          select: { wordId: true },
        }),
      ]);

    const streak = computeStreakFromDates(learnedRows.map((r) => r.updatedAt));
    const coreBadges = evaluateBadges(learnedWordsCount, streak);

    const learnedIdSet = new Set(learnedWordIds.map((r) => r.wordId));
    const completed = findCompletedGroups({
      modules: modules.map((m) => ({
        id: m.id,
        slug: m.slug,
        name: m.name,
        words: m.words,
      })),
      learnedIdSet,
    });
    const groupBadges = badgesFromCompletedGroups(completed);

    const badges = [...coreBadges, ...groupBadges];

    return NextResponse.json({
      learnedWordsCount,
      streak,
      badges,
      groupBadges,
      completedGroups: completed.length,
      earnedCount: badges.filter((b) => b.earned).length,
      totalCount: badges.length,
    });
  } catch (error) {
    console.error('Rozet getirme hatası:', error);
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
  }
}
