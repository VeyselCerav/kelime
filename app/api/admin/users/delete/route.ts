import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function DELETE(request: Request) {
  try {
    // Admin kontrolü
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    // Kullanıcı ID'sini al
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı ID gerekli' },
        { status: 400 }
      );
    }

    // Admin kendisini silemesin
    if (session.user.id === userId) {
      return NextResponse.json(
        { error: 'Admin kendisini silemez' },
        { status: 400 }
      );
    }

    // Kullanıcıyı ve ilişkili verileri sil
    await prisma.$transaction([
      // Kullanıcının öğrendiği kelimeleri sil
      prisma.learnedWord.deleteMany({
        where: { userId: parseInt(userId) }
      }),
      // Kullanıcının günlük hedeflerini sil
      prisma.dailyGoal.deleteMany({
        where: { userId: parseInt(userId) }
      }),
      // Kullanıcıyı sil
      prisma.user.delete({
        where: { id: parseInt(userId) }
      })
    ]);

    return NextResponse.json({ message: 'Kullanıcı başarıyla silindi' });
  } catch (error) {
    console.error('Kullanıcı silme hatası:', error);
    return NextResponse.json(
      { error: 'Kullanıcı silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 