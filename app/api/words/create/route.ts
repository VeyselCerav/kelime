import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Admin kontrolü
    const token = await getToken({ req: request as any });
    
    console.log('Token:', token);

    if (!token || !token.isAdmin) {
      console.log('Yetkisiz erişim denemesi:', token);
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);

    const { word, meaning, example } = body;

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

    console.log('Yeni kelime eklendi:', newWord);

    return NextResponse.json(newWord, { status: 201 });
  } catch (error) {
    console.error('Kelime ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Kelime eklenirken bir hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') },
      { status: 500 }
    );
  }
} 