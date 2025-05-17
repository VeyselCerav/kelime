import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

const BADGES = [
  {
    id: 'beginner',
    name: 'Başlangıç',
    description: 'İlk kelimeyi öğrendin!',
    requirement: 1,
    type: 'words'
  },
  {
    id: 'hardworking',
    name: 'Çalışkan',
    description: '50 kelime öğrendin!',
    requirement: 50,
    type: 'words'
  },
  {
    id: 'expert',
    name: 'Uzman',
    description: '100 kelime öğrendin!',
    requirement: 100,
    type: 'words'
  },
  {
    id: 'persistent',
    name: 'Azimli',
    description: '7 gün boyunca çalıştın!',
    requirement: 7,
    type: 'streak'
  },
  {
    id: 'determined',
    name: 'Kararlı',
    description: '30 gün boyunca çalıştın!',
    requirement: 30,
    type: 'streak'
  }
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Kullanıcının rozetlerini getir
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true }
    });

    // Kullanıcının istatistiklerini getir
    const stats = await prisma.userProgress.findFirst({
      where: { userId }
    });

    const earnedBadges = BADGES.map(badge => {
      const hasEarned = userBadges.some(ub => ub.badge.id === badge.id);
      const progress = badge.type === 'words' ? stats?.totalWords || 0 : stats?.streak || 0;
      const percentage = Math.min(100, Math.round((progress / badge.requirement) * 100));

      return {
        ...badge,
        earned: hasEarned,
        progress,
        percentage
      };
    });

    return NextResponse.json(earnedBadges);
  } catch (error) {
    console.error('Rozet getirme hatası:', error);
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
  }
} 