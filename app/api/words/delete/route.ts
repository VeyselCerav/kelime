import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return new NextResponse(JSON.stringify({ error: 'Yetkisiz erişim' }), {
        status: 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse(JSON.stringify({ error: 'ID parametresi gerekli' }), {
        status: 400,
      });
    }

    const word = await prisma.word.delete({
      where: {
        id: parseInt(id),
      },
    });

    return new NextResponse(JSON.stringify(word), {
      status: 200,
    });
  } catch (error) {
    console.error('Kelime silme hatası:', error);
    return new NextResponse(JSON.stringify({ error: 'Kelime silinirken bir hata oluştu' }), {
      status: 500,
    });
  }
} 