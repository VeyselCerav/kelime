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

    const word = await prisma.word.create({
      data: {
        english,
        turkish,
        week: parseInt(week)
      }
    });

    return NextResponse.json(word);
  } catch (error) {
    return NextResponse.json(
      { error: 'Kelime eklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const words = await prisma.word.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(words);
  } catch (error) {
    return NextResponse.json(
      { error: 'Kelimeler getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 