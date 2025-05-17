import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { english, turkish, week } = body;

    if (!english || !turkish || !week) {
      return NextResponse.json(
        { error: 'İngilizce, Türkçe ve hafta bilgisi gereklidir' },
        { status: 400 }
      );
    }

    await prisma.$connect();
    
    const word = await prisma.word.create({
      data: {
        english,
        turkish,
        week: parseInt(week)
      }
    });

    return NextResponse.json(word);
  } catch (error) {
    console.error('Kelime ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Kelime eklenirken bir hata oluştu: ' + error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET isteği - Herkes erişebilir
export async function GET() {
  try {
    console.log('Kelimeler getiriliyor...');
    
    // Veritabanı bağlantısını kontrol et
    await prisma.$connect();
    console.log('Veritabanı bağlantısı başarılı');
    
    const words = await prisma.word.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('Bulunan kelime sayısı:', words.length);
    console.log('İlk birkaç kelime:', words.slice(0, 3));
    
    return NextResponse.json(words);
  } catch (error) {
    console.error('Detaylı hata bilgisi:', error);
    return NextResponse.json(
      { error: 'Kelimeler getirilirken bir hata oluştu: ' + error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 