import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { buildModuleGroups } from '@/lib/module-groups';
import { filterModulesForUser } from '@/lib/module-access';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? parseInt(session.user.id, 10) : null;
    const user = userId
      ? {
          id: userId,
          isAdmin: Boolean(session?.user?.isAdmin),
        }
      : null;

    const modules = await prisma.module.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        words: {
          select: { id: true, english: true, category: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    const visible = await filterModulesForUser(modules, user);

    return NextResponse.json(
      visible.map((m) => {
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
          isRestricted: m.isRestricted,
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
