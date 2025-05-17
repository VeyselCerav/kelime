import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

// Ezberlenemeyen kelimeleri getir
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Kullanıcının var olup olmadığını kontrol et
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const unlearnedWords = await prisma.unlearnedWord.findMany({
      where: { userId },
      include: {
        word: {
          select: {
            id: true,
            english: true,
            turkish: true
          }
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // API yanıtını düzenle
    const formattedWords = unlearnedWords.map(uw => ({
      id: uw.id,
      word: {
        id: uw.word.id,
        english: uw.word.english,
        turkish: uw.word.turkish
      }
    }));

    return NextResponse.json(formattedWords);
  } catch (error) {
    console.error('Ezberlenemeyen kelimeler getirme hatası:', error);
    return NextResponse.json(
      { error: 'Kelimeler getirilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

// Yeni ezberlenemeyen kelime ekle
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { wordId } = await request.json();

    if (!wordId) {
      return NextResponse.json({ error: 'Kelime ID\'si gereklidir' }, { status: 400 });
    }

    // Kullanıcının var olup olmadığını kontrol et
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Kelimenin var olup olmadığını kontrol et
    const word = await prisma.word.findUnique({
      where: { id: wordId },
    });

    if (!word) {
      return NextResponse.json({ error: 'Kelime bulunamadı' }, { status: 404 });
    }

    // Kelime zaten eklenmiş mi kontrol et
    const existingWord = await prisma.unlearnedWord.findUnique({
      where: {
        userId_wordId: {
          userId,
          wordId,
        },
      },
    });

    if (existingWord) {
      return NextResponse.json(existingWord);
    }

    // Yeni kelimeyi ekle
    const unlearnedWord = await prisma.unlearnedWord.create({
      data: {
        user: {
          connect: { id: userId }
        },
        word: {
          connect: { id: wordId }
        }
      },
      include: {
        word: true,
      },
    });

    // LearnedWord tablosunu güncelle
    await prisma.learnedWord.upsert({
      where: {
        userId_wordId: {
          userId,
          wordId,
        },
      },
      create: {
        userId,
        wordId,
        isLearned: false
      },
      update: {
        isLearned: false
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

// Ezberlenemeyen kelimeyi kaldır
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { wordId } = await request.json();

    if (!wordId) {
      return NextResponse.json({ error: 'Kelime ID\'si gereklidir' }, { status: 400 });
    }

    // Önce kaydın var olup olmadığını kontrol et
    const existingWord = await prisma.unlearnedWord.findUnique({
      where: {
        userId_wordId: {
          userId,
          wordId,
        },
      },
    });

    // Kayıt yoksa başarılı yanıt dön
    if (!existingWord) {
      return NextResponse.json({ success: true });
    }

    // Kayıt varsa sil
    await prisma.unlearnedWord.delete({
      where: {
        userId_wordId: {
          userId,
          wordId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ezberlenemeyen kelime silme hatası:', error);
    return NextResponse.json(
      { error: 'Kelime silinirken bir hata oluştu.' },
      { status: 500 }
    );
  }
} 