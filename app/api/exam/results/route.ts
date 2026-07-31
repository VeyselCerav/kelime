import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const results = await prisma.examResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Sınav sonuçları hatası:', error);
    return NextResponse.json({ error: 'Sonuçlar alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const body = await request.json();
    const questionCount = Number(body.questionCount);
    const correctCount = Number(body.correctCount);
    const wrongCount = Number(body.wrongCount);
    const score = Number(body.score);

    if (
      !Number.isFinite(questionCount) ||
      !Number.isFinite(correctCount) ||
      !Number.isFinite(wrongCount) ||
      !Number.isFinite(score) ||
      questionCount < 1
    ) {
      return NextResponse.json({ error: 'Geçersiz sınav sonucu' }, { status: 400 });
    }

    const result = await prisma.examResult.create({
      data: {
        userId,
        questionCount,
        correctCount,
        wrongCount,
        score,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Sınav kaydetme hatası:', error);
    return NextResponse.json({ error: 'Sınav sonucu kaydedilemedi' }, { status: 500 });
  }
}
