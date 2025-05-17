import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    const searchParams = new URL(request.url).searchParams;
    const week = searchParams.get('week');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

    // Kelimeleri getir
    const words = await prisma.word.findMany({
      where: week ? { week: parseInt(week) } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    if (words.length < 4) {
      return NextResponse.json(
        { error: 'Test için yeterli kelime bulunmuyor. En az 4 kelime gerekli.' },
        { status: 400 }
      );
    }

    // Her kelime için bir soru oluştur
    const questions = words.map((word) => {
      // Doğru cevap dışındaki kelimeleri seç
      const otherWords = words.filter((w) => w.id !== word.id);
      
      // Rastgele 3 yanlış cevap seç
      const wrongAnswers = [...otherWords]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.turkish);

      // Tüm seçenekleri oluştur ve karıştır
      const options = [...wrongAnswers, word.turkish].sort(() => Math.random() - 0.5);

      return {
        id: word.id,
        question: `"${word.english}" kelimesinin Türkçe anlamı nedir?`,
        options,
        answer: word.turkish,
        wordId: word.id,
      };
    });

    // Soruları karıştır ve limitle
    const shuffledQuestions = [...questions]
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);

    if (shuffledQuestions.length === 0) {
      return NextResponse.json(
        { error: 'Bu haftaya ait soru bulunamadı.' },
        { status: 404 }
      );
    }

    return NextResponse.json(shuffledQuestions);
  } catch (error) {
    console.error('Quiz soruları getirme hatası:', error);
    return NextResponse.json(
      { error: 'Sorular yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.' },
      { status: 500 }
    );
  }
} 