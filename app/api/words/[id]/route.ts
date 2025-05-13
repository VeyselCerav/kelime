import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await cookies().get('session');
    
    if (!session?.value) {
      return NextResponse.json(
        { error: 'Yetkilendirme başarısız' },
        { status: 401 }
      );
    }

    const wordId = parseInt(params.id);
    
    if (isNaN(wordId)) {
      return NextResponse.json(
        { error: 'Geçersiz kelime ID' },
        { status: 400 }
      );
    }

    await prisma.word.delete({
      where: {
        id: wordId,
      },
    });

    return NextResponse.json({ message: 'Kelime başarıyla silindi' });
  } catch (error) {
    console.error('Kelime silinirken hata:', error);
    return NextResponse.json(
      { error: 'Kelime silinirken bir hata oluştu' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 