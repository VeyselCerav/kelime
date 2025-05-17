import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const token = await getToken({ req: request });
    
    if (!token || token.username !== 'semihsacli') {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

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