import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';
import { generateMemoryParagraph, geminiUserMessage } from '@/lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_WORDS = 10;
const MIN_WORDS = 3;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: 'Geçersiz kullanıcı' }, { status: 400 });
    }

    const body = await request.json();
    const wordIds = Array.isArray(body.wordIds)
      ? (body.wordIds as unknown[])
          .map((id) => parseInt(String(id), 10))
          .filter((id) => Number.isFinite(id))
      : [];

    const uniqueIds = Array.from(new Set(wordIds)).slice(0, MAX_WORDS);
    if (uniqueIds.length < MIN_WORDS) {
      return NextResponse.json(
        { error: `En az ${MIN_WORDS} kelime seçmelisin (en fazla ${MAX_WORDS}).` },
        { status: 400 }
      );
    }

    const unlearned = await prisma.unlearnedWord.findMany({
      where: { userId, wordId: { in: uniqueIds } },
      include: {
        word: {
          select: { id: true, english: true, turkish: true, moduleId: true },
        },
      },
    });

    if (unlearned.length < MIN_WORDS) {
      return NextResponse.json(
        {
          error:
            'Seçilen kelimelerin çoğu ezberleyemedikler listesinde değil. Listeyi yenile.',
        },
        { status: 400 }
      );
    }

    const words = uniqueIds
      .map((id) => unlearned.find((u) => u.wordId === id)?.word)
      .filter((w): w is NonNullable<typeof w> => Boolean(w));

    const paragraph = await generateMemoryParagraph(words);

    return NextResponse.json({
      title: paragraph.title,
      english: paragraph.english,
      turkish: paragraph.turkish,
      words,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('AI paragraf hatası:', message);
    const missingKey = message.includes('GEMINI_API_KEY');
    return NextResponse.json(
      {
        error: missingKey
          ? 'AI servisi yapılandırılmamış. GEMINI_API_KEY ekleyin.'
          : geminiUserMessage(message),
      },
      { status: missingKey ? 503 : 500 }
    );
  }
}
