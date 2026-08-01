import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import {
  isSystemModule,
  parseWordJson,
} from '@/lib/module-import';
import { groupCountFromTotal } from '@/lib/subgroups';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) return null;
  return session;
}

type Ctx = { params: { id: string } };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });
    }

    const module = await prisma.module.findUnique({
      where: { id },
      include: { _count: { select: { words: true } } },
    });
    if (!module) {
      return NextResponse.json({ error: 'Modül bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({
      id: module.id,
      slug: module.slug,
      name: module.name,
      description: module.description,
      sortOrder: module.sortOrder,
      wordCount: module._count.words,
      groupCount: groupCountFromTotal(module._count.words),
      isSystem: isSystemModule(module.slug),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}

/** Ad / açıklama güncelle */
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });
    }

    const existing = await prisma.module.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Modül bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const data: { name?: string; description?: string | null } = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      data.name = body.name.trim();
    }
    if (body.description !== undefined) {
      data.description =
        typeof body.description === 'string' && body.description.trim()
          ? body.description.trim()
          : null;
    }

    if (!data.name && body.description === undefined) {
      return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });
    }

    const updated = await prisma.module.update({
      where: { id },
      data,
      include: { _count: { select: { words: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      description: updated.description,
      sortOrder: updated.sortOrder,
      wordCount: updated._count.words,
      groupCount: groupCountFromTotal(updated._count.words),
      isSystem: isSystemModule(updated.slug),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 });
  }
}

/** Modüle ek JSON kelime yükle (yinelenenleri atla) */
export async function POST(request: Request, { params }: Ctx) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });
    }

    const existing = await prisma.module.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Modül bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const jsonPayload = body.json ?? body.words ?? null;
    if (jsonPayload == null) {
      return NextResponse.json({ error: 'Kelime JSON’u zorunlu' }, { status: 400 });
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

    const current = await prisma.word.findMany({
      where: { moduleId: id },
      select: { english: true },
    });
    const existingSet = new Set(current.map((w) => w.english.toLowerCase()));

    const addedBy =
      session.user.username || session.user.email || 'admin';

    const toCreate = words
      .filter((w) => !existingSet.has(w.english.toLowerCase()))
      .map((w) => ({
        english: w.english,
        turkish: w.turkish,
        category: w.category ?? null,
        moduleId: id,
        addedBy,
      }));

    let created = 0;
    const BATCH = 200;
    for (let i = 0; i < toCreate.length; i += BATCH) {
      const chunk = toCreate.slice(i, i + BATCH);
      const result = await prisma.word.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      created += result.count;
    }

    const wordCount = await prisma.word.count({ where: { moduleId: id } });

    return NextResponse.json({
      imported: created,
      skipped: words.length - created,
      totalInFile: words.length,
      wordCount,
      groupCount: groupCountFromTotal(wordCount),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'İçe aktarma başarısız' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });
    }

    const existing = await prisma.module.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Modül bulunamadı' }, { status: 404 });
    }

    if (isSystemModule(existing.slug)) {
      return NextResponse.json(
        {
          error:
            'Sistem modülleri (Genel / En Sık Çıkan) silinemez. Adını düzenleyebilir veya kelime ekleyebilirsiniz.',
        },
        { status: 400 }
      );
    }

    await prisma.module.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Silinemedi' }, { status: 500 });
  }
}
