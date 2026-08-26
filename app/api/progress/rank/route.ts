import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAllUserActivityStats } from '@/lib/user-rankings';

export const dynamic = 'force-dynamic';

/** GET /api/progress/rank — sadece kendi sıralaman (başkalarının adı yok) */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: 'Geçersiz kullanıcı' }, { status: 400 });
    }

    const stats = await getAllUserActivityStats();
    const me = stats.find((u) => u.id === userId);
    if (!me) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({
      totalUsers: stats.length,
      learnedCount: me.learnedCount,
      activityScore: me.activityScore,
      quizCount: me.quizCount,
      raceCount: me.raceCount,
      learnedRank: me.learnedRank,
      activityRank: me.activityRank,
    });
  } catch (error) {
    console.error('Sıralama hatası:', error);
    return NextResponse.json({ error: 'Sıralama alınamadı' }, { status: 500 });
  }
}
