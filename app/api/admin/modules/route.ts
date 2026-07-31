import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import {
  parseWordJson,
  slugifyModuleName,
} from '@/lib/module-import';
import { groupCountFromTotal } from '@/lib/subgroups';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const modules = await prisma.module.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { words: true } } },
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
    console.error('Admin modül listesi:', error);
    return NextResponse.json({ error: 'Modüller alınamadı' }, { status: 500 });
  }
}

/** Yeni modül + JSON kelimeleri */
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description =
      typeof body.description === 'string' ? body.description.trim() : null;
    const jsonPayload = body.json ?? body.words ?? null;

    if (!name) {
      return NextResponse.json({ error: 'Modül adı zorunlu' }, { status: 400 });
    }
    if (jsonPayload == null) {
      return NextResponse.json(
        { error: 'Kelime JSON’u zorunlu' },
        { status: 400 }
      );
    }

    let words;
    try {
      words = parseWordJson(jsonPayload);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'JSON parse hatası' },
        { status: 400 }
      );
    }

    let slug = slugifyModuleName(name);
    let suffix = 2;
    while (await prisma.module.findUnique({ where: { slug } })) {
      slug = `${slugifyModuleName(name)}-${suffix}`;
      suffix += 1;
    }

    const maxSort = await prisma.module.aggregate({ _max: { sortOrder: true } });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const addedBy =
      session.user.username || session.user.email || 'admin';

    const module = await prisma.module.create({
      data: {
        slug,
        name,
        description: description || null,
        sortOrder,
      },
    });

    // Yinelenenleri atla (modül içi boş; yine de dosya içi dedupe parse’ta yapıldı)
    const data = words.map((w) => ({
      english: w.english,
      turkish: w.turkish,
      moduleId: module.id,
      addedBy,
    }));

    const BATCH = 200;
    let created = 0;
    for (let i = 0; i < data.length; i += BATCH) {
      const chunk = data.slice(i, i + BATCH);
      const result = await prisma.word.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      created += result.count;
    }

    return NextResponse.json(
      {
        module: {
          id: module.id,
          slug: module.slug,
          name: module.name,
          description: module.description,
          sortOrder: module.sortOrder,
        },
        imported: created,
        skipped: words.length - created,
        totalInFile: words.length,
        groupCount: groupCountFromTotal(created),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Modül oluşturma hatası:', error);
    return NextResponse.json(
      {
        error:
          'Modül oluşturulamadı: ' +
          (error instanceof Error ? error.message : 'Bilinmeyen hata'),
      },
      { status: 500 }
    );
  }
}
