import { prisma } from '@/lib/prisma';

export type ModuleAccessUser = {
  id: number;
  isAdmin?: boolean | null;
} | null;

/** Kısıtlı modüle erişim: admin veya ModuleAccess kaydı */
export async function canAccessModule(params: {
  moduleId: number;
  user: ModuleAccessUser;
  isRestricted?: boolean;
}): Promise<boolean> {
  const { moduleId, user } = params;
  if (!user?.id) return false;
  if (user.isAdmin) return true;

  let isRestricted = params.isRestricted;
  if (isRestricted === undefined) {
    const mod = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { isRestricted: true },
    });
    if (!mod) return false;
    isRestricted = mod.isRestricted;
  }

  if (!isRestricted) return true;

  const row = await prisma.moduleAccess.findUnique({
    where: {
      moduleId_userId: { moduleId, userId: user.id },
    },
    select: { id: true },
  });
  return Boolean(row);
}

/** Liste için: kısıtlı olmayanlar + yetkili olunanlar (+ admin hepsi) */
export async function filterModulesForUser<
  T extends { id: number; isRestricted: boolean },
>(modules: T[], user: ModuleAccessUser): Promise<T[]> {
  if (!user?.id) return modules.filter((m) => !m.isRestricted);
  if (user.isAdmin) return modules;

  const access = await prisma.moduleAccess.findMany({
    where: { userId: user.id },
    select: { moduleId: true },
  });
  const allowed = new Set(access.map((a) => a.moduleId));
  return modules.filter((m) => !m.isRestricted || allowed.has(m.id));
}
