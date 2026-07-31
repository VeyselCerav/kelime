import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { groupPagination } from '@/lib/subgroups';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const moduleSlug = searchParams.get('module');
    const groupParam = searchParams.get('group');

    let resolvedModuleId: number | undefined;

    if (moduleId) {
      resolvedModuleId = parseInt(moduleId, 10);
    } else if (moduleSlug) {
      const mod = await prisma.module.findUnique({ where: { slug: moduleSlug } });
      if (!mod) {
        return NextResponse.json({ error: 'Modül bulunamadı' }, { status: 404 });
      }
      resolvedModuleId = mod.id;
    }

    const where = resolvedModuleId ? { moduleId: resolvedModuleId } : undefined;

    // Sabit dilimler: id sırası (1–20, 21–40…)
    if (groupParam && resolvedModuleId) {
      const groupIndex = Math.max(1, parseInt(groupParam, 10) || 1);
      const { skip, take } = groupPagination(groupIndex);
      const words = await prisma.word.findMany({
        where,
        orderBy: { id: 'asc' },
        skip,
        take,
        include: {
          module: { select: { id: true, slug: true, name: true } },
        },
      });
      return NextResponse.json(words);
    }

    const words = await prisma.word.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        module: { select: { id: true, slug: true, name: true } },
      },
    });

    return NextResponse.json(words);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Kelimeler getirilirken hata:', error);
    return NextResponse.json(
      { error: 'Kelimeler getirilirken bir hata oluştu: ' + message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { english, turkish, moduleId, week } = body;
    const resolvedModuleId = moduleId ?? week;

    if (!english || !turkish || !resolvedModuleId) {
      return NextResponse.json(
        { error: 'İngilizce, Türkçe ve modül bilgisi gereklidir' },
        { status: 400 }
      );
    }

    const word = await prisma.word.create({
      data: {
        english: String(english).trim(),
        turkish: String(turkish).trim(),
        moduleId: parseInt(String(resolvedModuleId), 10),
        addedBy: body.addedBy || 'api',
      },
    });

    return NextResponse.json(word);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Kelime ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Kelime eklenirken bir hata oluştu: ' + message },
      { status: 500 }
    );
  }
}
