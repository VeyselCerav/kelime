import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { ODEV_SLUG } from '@/lib/odev';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) return null;
  return session;
}

async function getOdevModule() {
  return prisma.module.findUnique({
    where: { slug: ODEV_SLUG },
    select: { id: true, name: true, slug: true, isRestricted: true },
  });
}

/** GET — Ödev yetkisi olan kullanıcılar + tüm kullanıcı listesi (checkbox için) */
export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const mod = await getOdevModule();
    if (!mod) {
      return NextResponse.json(
        { error: 'Ödev modülü henüz yok. Önce import-odev çalıştırın.' },
        { status: 404 }
      );
    }

    const [users, access] = await Promise.all([
      prisma.user.findMany({
        orderBy: { username: 'asc' },
        select: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
        },
      }),
      prisma.moduleAccess.findMany({
        where: { moduleId: mod.id },
        select: { userId: true },
      }),
    ]);

    const grantedIds = access.map((a) => a.userId);

    return NextResponse.json({
      module: mod,
      grantedUserIds: grantedIds,
      users,
    });
  } catch (error) {
    console.error('module-access GET:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

/** POST — body: { userId, grant: true|false } */
export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const mod = await getOdevModule();
    if (!mod) {
      return NextResponse.json({ error: 'Ödev modülü yok' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = parseInt(String(body.userId), 10);
    const grant = Boolean(body.grant);

    if (!userId) {
      return NextResponse.json({ error: 'userId gerekli' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isAdmin: true, username: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı yok' }, { status: 404 });
    }

    if (user.isAdmin) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: 'Admin zaten tüm kısıtlı modülleri görür',
      });
    }

    if (grant) {
      await prisma.moduleAccess.upsert({
        where: {
          moduleId_userId: { moduleId: mod.id, userId },
        },
        create: { moduleId: mod.id, userId },
        update: {},
      });
    } else {
      await prisma.moduleAccess.deleteMany({
        where: { moduleId: mod.id, userId },
      });
    }

    return NextResponse.json({
      ok: true,
      userId,
      grant,
      username: user.username,
    });
  } catch (error) {
    console.error('module-access POST:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
