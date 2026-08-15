import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildModuleGroups } from '@/lib/module-groups';

export async function GET() {
  try {
    const modules = await prisma.module.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        words: {
          select: { id: true, english: true, category: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    return NextResponse.json(
      modules.map((m) => {
        const meta = buildModuleGroups({
          words: m.words,
          moduleName: m.name,
          moduleSlug: m.slug,
        });
        return {
          id: m.id,
          slug: m.slug,
          name: m.name,
          description: m.description,
          sortOrder: m.sortOrder,
          wordCount: m.words.length,
          groupCount: meta.groups.length,
          groupMode: meta.groupMode,
          groups: meta.groups,
        };
      })
    );
  } catch (error) {
    console.error('Modül listesi hatası:', error);
    return NextResponse.json(
      { error: 'Modüller getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}
