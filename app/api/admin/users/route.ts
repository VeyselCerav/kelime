import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAllUserActivityStats } from '@/lib/user-rankings';

export const dynamic = 'force-dynamic';

/** GET /api/admin/users — detaylı istatistik + sıralamalar */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const stats = await getAllUserActivityStats();
    const byLearned = [...stats].sort(
      (a, b) => b.learnedCount - a.learnedCount || a.id - b.id
    );
    const byActivity = [...stats].sort(
      (a, b) => b.activityScore - a.activityScore || a.id - b.id
    );

    return NextResponse.json({
      totalUsers: stats.length,
      users: stats.sort((a, b) => a.id - b.id),
      topLearned: byLearned.slice(0, 20),
      topActivity: byActivity.slice(0, 20),
    });
  } catch (error) {
    console.error('Kullanıcılar listelenirken hata:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
