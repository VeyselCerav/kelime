import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userId = parseInt(session.user.id);

    // Önce kullanıcının var olup olmadığını kontrol et
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const dailyGoal = await prisma.dailyGoal.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (!dailyGoal) {
      try {
        // Varsayılan günlük hedef: 10 kelime
        const newDailyGoal = await prisma.dailyGoal.create({
          data: {
            userId,
            target: 10,
            achieved: 0,
            date: today,
          },
        });
        return NextResponse.json(newDailyGoal);
      } catch (error) {
        console.error('Daily Goal creation error:', error);
        return NextResponse.json(
          { error: 'Günlük hedef oluşturulurken bir hata oluştu' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(dailyGoal);
  } catch (error) {
    console.error('Daily Goal API Error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const data = await request.json();
    const { target, achieved } = data;

    const userId = parseInt(session.user.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyGoal = await prisma.dailyGoal.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      create: {
        userId,
        target: target || 10,
        achieved: achieved || 0,
        date: today,
        completed: (achieved || 0) >= (target || 10),
      },
      update: {
        target: target !== undefined ? target : undefined,
        achieved: achieved !== undefined ? achieved : undefined,
        completed: achieved !== undefined && target !== undefined ? achieved >= target : undefined,
      },
    });

    return NextResponse.json(dailyGoal);
  } catch (error) {
    console.error('Daily Goal API Error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
} 