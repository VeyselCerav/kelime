import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

export async function DELETE(request: Request) {
  try {
    const token = await getToken({ req: request });
    
    if (!token || token.username !== 'semihsacli') {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    const { wordId } = await request.json();
    
    if (!wordId) {
      return NextResponse.json(
        { error: 'Kelime ID\'si gereklidir' },
        { status: 400 }
      );
    }

    await prisma.$connect();
    
    await prisma.word.delete({
      where: {
        id: parseInt(wordId)
      }
    });

    return NextResponse.json({ message: 'Kelime başarıyla silindi' });
  } catch (error) {
    console.error('Kelime silme hatası:', error);
    return NextResponse.json(
      { error: 'Kelime silinirken bir hata oluştu: ' + error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 