import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

function dayKey(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Günlük / haftalık tekrar kelimeleri */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401, headers: NO_STORE }
      );
    }

    const userId = parseInt(session.user.id, 10);
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') === 'weekly' ? 'weekly' : 'daily';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = new Date(today);
    if (scope === 'weekly') {
      from.setDate(today.getDate() - 6);
    }

    const rows = await prisma.learnedWord.findMany({
      where: {
        userId,
        isLearned: true,
        updatedAt: { gte: from },
      },
      include: {
        word: {
          select: {
            id: true,
            english: true,
            turkish: true,
            moduleId: true,
            imageUrl: true,
            module: { select: { slug: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const words = rows.map((r) => ({
      id: r.word.id,
      english: r.word.english,
      turkish: r.word.turkish,
      moduleId: r.word.moduleId,
      imageUrl: r.word.imageUrl,
      moduleSlug: r.word.module.slug,
      learnedAt: r.updatedAt,
      day: dayKey(r.updatedAt),
    }));

    return NextResponse.json(
      {
        scope,
        words,
        total: words.length,
        label: scope === 'weekly' ? 'Haftalık tekrar' : 'Günlük tekrar',
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error('Tekrar listesi hatası:', error);
    return NextResponse.json(
      { error: 'Tekrar listesi alınamadı' },
      { status: 500, headers: NO_STORE }
    );
  }
}
