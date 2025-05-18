import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    // Admin kontrolü
    const token = await getToken({ req: request as any });
    
    if (!token || !token.isAdmin) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    // URL'den kelime ID'sini al
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Kelime ID\'si gereklidir' },
        { status: 400 }
      );
    }

    // Kelimeyi sil
    await prisma.word.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Kelime silme hatası:', error);
    return NextResponse.json(
      { error: 'Kelime silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 