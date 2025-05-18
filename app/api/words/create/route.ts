import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      console.log('Yetkisiz erişim denemesi:', session?.user);
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);

    const { english, turkish, week } = body;

    // Gerekli alanların kontrolü
    if (!english || !turkish || !week) {
      return NextResponse.json(
        { error: 'İngilizce kelime, Türkçe anlamı ve hafta bilgisi zorunludur' },
        { status: 400 }
      );
    }

    // Kelimeyi veritabanına ekle
    const newWord = await prisma.word.create({
      data: {
        english: english,
        turkish: turkish,
        week: parseInt(week),
        addedBy: session.user.username,
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