import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { english, turkish, moduleId, week } = body;
    const resolvedModuleId = moduleId ?? week;

    if (!english || !turkish || !resolvedModuleId) {
      return NextResponse.json(
        { error: 'İngilizce kelime, Türkçe anlamı ve modül bilgisi zorunludur' },
        { status: 400 }
      );
    }

    const newWord = await prisma.word.create({
      data: {
        english: String(english).trim(),
        turkish: String(turkish).trim(),
        moduleId: parseInt(String(resolvedModuleId), 10),
        addedBy: session.user.username || session.user.email || 'admin',
      },
    });

    return NextResponse.json(newWord, { status: 201 });
  } catch (error) {
    console.error('Kelime ekleme hatası:', error);
    return NextResponse.json(
      {
        error:
          'Kelime eklenirken bir hata oluştu: ' +
          (error instanceof Error ? error.message : 'Bilinmeyen hata'),
      },
      { status: 500 }
    );
  }
}
