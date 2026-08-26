import { prisma } from '@/lib/prisma';

export type UserActivityStats = {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
  learnedCount: number;
  unlearnedCount: number;
  quizCount: number;
  raceCount: number;
  raceWins: number;
  /** Tüm zamanlar: ezber + quiz + yarış */
  activityScore: number;
  lastActiveAt: Date | null;
  learnedRank: number;
  activityRank: number;
};

function denseRanks(
  items: { id: number; value: number }[]
): Map<number, number> {
  const sorted = [...items].sort((a, b) => b.value - a.value || a.id - b.id);
  const map = new Map<number, number>();
  let rank = 0;
  let prev: number | null = null;
  for (const item of sorted) {
    if (prev === null || item.value !== prev) {
      rank += 1;
      prev = item.value;
    }
    map.set(item.id, rank);
  }
  return map;
}

/** Tüm kullanıcıların ezber / aktivite istatistikleri + sıralamalar */
export async function getAllUserActivityStats(): Promise<UserActivityStats[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: { id: 'asc' },
  });

  if (users.length === 0) return [];

  const ids = users.map((u) => u.id);

  const [
    learnedGroups,
    unlearnedGroups,
    quizGroups,
    raceGroups,
    raceWinGroups,
    lastLearned,
    lastQuiz,
    lastRace,
  ] = await Promise.all([
    prisma.learnedWord.groupBy({
      by: ['userId'],
      where: { userId: { in: ids }, isLearned: true },
      _count: { _all: true },
    }),
    prisma.unlearnedWord.groupBy({
      by: ['userId'],
      where: { userId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.examResult.groupBy({
      by: ['userId'],
      where: { userId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.raceResult.groupBy({
      by: ['userId'],
      where: { userId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.raceResult.groupBy({
      by: ['userId'],
      where: { userId: { in: ids }, won: true },
      _count: { _all: true },
    }),
    prisma.learnedWord.groupBy({
      by: ['userId'],
      where: { userId: { in: ids } },
      _max: { updatedAt: true },
    }),
    prisma.examResult.groupBy({
      by: ['userId'],
      where: { userId: { in: ids } },
      _max: { createdAt: true },
    }),
    prisma.raceResult.groupBy({
      by: ['userId'],
      where: { userId: { in: ids } },
      _max: { createdAt: true },
    }),
  ]);

  const learnedMap = new Map(
    learnedGroups.map((g) => [g.userId, g._count._all])
  );
  const unlearnedMap = new Map(
    unlearnedGroups.map((g) => [g.userId, g._count._all])
  );
  const quizMap = new Map(quizGroups.map((g) => [g.userId, g._count._all]));
  const raceMap = new Map(raceGroups.map((g) => [g.userId, g._count._all]));
  const raceWinMap = new Map(
    raceWinGroups.map((g) => [g.userId, g._count._all])
  );
  const lastLearnedMap = new Map(
    lastLearned.map((g) => [g.userId, g._max.updatedAt])
  );
  const lastQuizMap = new Map(lastQuiz.map((g) => [g.userId, g._max.createdAt]));
  const lastRaceMap = new Map(lastRace.map((g) => [g.userId, g._max.createdAt]));

  const base = users.map((u) => {
    const learnedCount = learnedMap.get(u.id) ?? 0;
    const unlearnedCount = unlearnedMap.get(u.id) ?? 0;
    const quizCount = quizMap.get(u.id) ?? 0;
    const raceCount = raceMap.get(u.id) ?? 0;
    const raceWins = raceWinMap.get(u.id) ?? 0;
    const activityScore = learnedCount + quizCount + raceCount;
    const dates = [
      lastLearnedMap.get(u.id),
      lastQuizMap.get(u.id),
      lastRaceMap.get(u.id),
      u.createdAt,
    ].filter((d): d is Date => Boolean(d));
    const lastActiveAt =
      dates.length > 0
        ? new Date(Math.max(...dates.map((d) => d.getTime())))
        : null;

    return {
      id: u.id,
      username: u.username,
      email: u.email,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      learnedCount,
      unlearnedCount,
      quizCount,
      raceCount,
      raceWins,
      activityScore,
      lastActiveAt,
    };
  });

  const learnedRank = denseRanks(
    base.map((u) => ({ id: u.id, value: u.learnedCount }))
  );
  const activityRank = denseRanks(
    base.map((u) => ({ id: u.id, value: u.activityScore }))
  );

  return base.map((u) => ({
    ...u,
    learnedRank: learnedRank.get(u.id) ?? base.length,
    activityRank: activityRank.get(u.id) ?? base.length,
  }));
}
