import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Admin kontrolü
    const token = await getToken({ req: request as any });
    
    if (!token || !token.isAdmin) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    const { word, meaning, example } = await request.json();

    // Gerekli alanların kontrolü
    if (!word || !meaning) {
      return NextResponse.json(
        { error: 'Kelime ve anlamı zorunludur' },
        { status: 400 }
      );
    }

    // Kelimeyi veritabanına ekle
    const newWord = await prisma.word.create({
      data: {
        word,
        meaning,
        example: example || '',
        addedBy: token.username as string,
      },
    });

    return NextResponse.json(newWord, { status: 201 });
  } catch (error) {
    console.error('Kelime ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Kelime eklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 