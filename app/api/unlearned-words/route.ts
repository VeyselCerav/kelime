import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

/** Ezberlenemeyen kelimeler — modül bilgisiyle */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401, headers: NO_STORE }
      );
    }

    const userId =
      typeof session.user.id === 'string'
        ? parseInt(session.user.id, 10)
        : session.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404, headers: NO_STORE });
    }

    const unlearnedWords = await prisma.unlearnedWord.findMany({
      where: { userId },
      include: {
        word: {
          select: {
            id: true,
            english: true,
            turkish: true,
            moduleId: true,
            module: {
              select: { id: true, slug: true, name: true, sortOrder: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedWords = unlearnedWords.map((uw) => ({
      id: uw.id,
      word: {
        id: uw.word.id,
        english: uw.word.english,
        turkish: uw.word.turkish,
        moduleId: uw.word.moduleId,
        module: uw.word.module,
      },
    }));

    // Modül bazlı grup
    const byModule = new Map<
      number,
      {
        moduleId: number;
        slug: string;
        name: string;
        sortOrder: number;
        words: { id: number; english: string; turkish: string }[];
      }
    >();

    for (const row of formattedWords) {
      const m = row.word.module;
      if (!m) continue;
      if (!byModule.has(m.id)) {
        byModule.set(m.id, {
          moduleId: m.id,
          slug: m.slug,
          name: m.name,
          sortOrder: m.sortOrder,
          words: [],
        });
      }
      byModule.get(m.id)!.words.push({
        id: row.word.id,
        english: row.word.english,
        turkish: row.word.turkish,
      });
    }

    const modules = Array.from(byModule.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder
    );

    return NextResponse.json({
      words: formattedWords,
      modules,
      total: formattedWords.length,
    }, { headers: NO_STORE });
  } catch (error) {
    console.error('Ezberlenemeyen kelimeler getirme hatası:', error);
    return NextResponse.json(
      { error: 'Kelimeler getirilirken bir hata oluştu.' },
      { status: 500, headers: NO_STORE }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    let userId: number;
    try {
      userId = parseInt(session.user.id, 10);
      if (isNaN(userId)) throw new Error('Geçersiz kullanıcı ID');
    } catch {
      return NextResponse.json({ error: 'Geçersiz kullanıcı ID' }, { status: 400 });
    }

    const { wordId } = await request.json();
    if (!wordId) {
      return NextResponse.json({ error: 'wordId gerekli' }, { status: 400 });
    }

    const existingWord = await prisma.unlearnedWord.findUnique({
      where: {
        userId_wordId: { userId, wordId: Number(wordId) },
      },
    });

    if (existingWord) {
      return NextResponse.json(existingWord);
    }

    const unlearnedWord = await prisma.unlearnedWord.create({
      data: {
        userId,
        wordId: Number(wordId),
      },
    });

    // Ezberlenen kaydı silme — sadece isLearned=false yap (geçmiş kaybolmasın)
    await prisma.learnedWord.upsert({
      where: {
        userId_wordId: { userId, wordId: Number(wordId) },
      },
      create: {
        userId,
        wordId: Number(wordId),
        isLearned: false,
      },
      update: {
        isLearned: false,
      },
    });

    return NextResponse.json(unlearnedWord);
  } catch (error) {
    console.error('Ezberlenemeyen kelime ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Kelime eklenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const { wordId } = await request.json();

    if (!wordId) {
      return NextResponse.json({ error: 'wordId gerekli' }, { status: 400 });
    }

    const existingWord = await prisma.unlearnedWord.findUnique({
      where: {
        userId_wordId: { userId, wordId: Number(wordId) },
      },
    });

    if (!existingWord) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    await prisma.unlearnedWord.delete({
      where: { id: existingWord.id },
    });

    // LearnedWord satırını silme — ezber geçmişi korunur
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Ezberlenemeyen kelime silme hatası:', error);
    return NextResponse.json(
      { error: 'Kelime kaldırılırken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
