import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { groupCountFromTotal } from '@/lib/subgroups';

export async function GET() {
  try {
    const modules = await prisma.module.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { words: true } },
      },
    });

    return NextResponse.json(
      modules.map((m) => ({
        id: m.id,
        slug: m.slug,
        name: m.name,
        description: m.description,
        sortOrder: m.sortOrder,
        wordCount: m._count.words,
        groupCount: groupCountFromTotal(m._count.words),
      }))
    );
  } catch (error) {
    console.error('Modül listesi hatası:', error);
    return NextResponse.json(
      { error: 'Modüller getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
