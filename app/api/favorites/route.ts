import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

function parseUserId(id: string | undefined) {
  if (!id) return null;
  const n = parseInt(id, 10);
  return Number.isNaN(n) ? null : n;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseUserId(session?.user?.id);
    if (!userId) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401, headers: NO_STORE }
      );
    }

    const rows = await prisma.favoriteWord.findMany({
      where: { userId },
      include: {
        word: {
          select: {
            id: true,
            english: true,
            turkish: true,
            moduleId: true,
            imageUrl: true,
            module: { select: { id: true, slug: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const words = rows.map((r) => ({
      id: r.word.id,
      english: r.word.english,
      turkish: r.word.turkish,
      moduleId: r.word.moduleId,
      imageUrl: r.word.imageUrl,
      module: r.word.module,
      favoritedAt: r.createdAt,
    }));

    return NextResponse.json(
      { words, total: words.length, wordIds: words.map((w) => w.id) },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error('Favoriler getirme hatası:', error);
    return NextResponse.json(
      { error: 'Favoriler alınamadı' },
      { status: 500, headers: NO_STORE }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseUserId(session?.user?.id);
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const wordId = parseInt(String(body.wordId), 10);
    if (!wordId) {
      return NextResponse.json({ error: 'wordId gerekli' }, { status: 400 });
    }

    const word = await prisma.word.findUnique({ where: { id: wordId } });
    if (!word) {
      return NextResponse.json({ error: 'Kelime bulunamadı' }, { status: 404 });
    }

    const fav = await prisma.favoriteWord.upsert({
      where: { userId_wordId: { userId, wordId } },
      create: { userId, wordId },
      update: {},
    });

    return NextResponse.json({ ok: true, id: fav.id });
  } catch (error) {
    console.error('Favori ekleme hatası:', error);
    return NextResponse.json({ error: 'Favori eklenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = parseUserId(session?.user?.id);
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const wordId = parseInt(String(body.wordId), 10);
    if (!wordId) {
      return NextResponse.json({ error: 'wordId gerekli' }, { status: 400 });
    }

    await prisma.favoriteWord.deleteMany({
      where: { userId, wordId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Favori silme hatası:', error);
    return NextResponse.json({ error: 'Favori kaldırılamadı' }, { status: 500 });
  }
}
