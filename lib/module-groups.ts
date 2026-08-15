import { prisma } from '@/lib/prisma';
import { GROUP_SIZE, WordGroupInfo, buildGroups } from '@/lib/subgroups';
import { mixWordsByLetter } from '@/lib/word-order';

export type GroupMode = 'fixed' | 'category';

export interface ModuleGroupMeta {
  groupMode: GroupMode;
  groups: WordGroupInfo[];
}

/** Modülün alt gruplarını hesapla (kategori varsa tense adları). */
export function buildModuleGroups(params: {
  words: { id: number; category: string | null }[];
  moduleName: string;
  moduleSlug?: string;
}): ModuleGroupMeta {
  const { words, moduleName, moduleSlug } = params;
  const categorized = words.filter((w) => w.category && w.category.trim());

  if (words.length > 0 && categorized.length === words.length) {
    const order: string[] = [];
    const counts = new Map<string, number>();

    for (const w of words) {
      const cat = w.category!.trim();
      if (!counts.has(cat)) {
        order.push(cat);
        counts.set(cat, 0);
      }
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }

    let cursor = 1;
    const groups: WordGroupInfo[] = order.map((name, i) => {
      const count = counts.get(name) || 0;
      const start = cursor;
      const end = cursor + count - 1;
      cursor += count;
      return {
        index: i + 1,
        label: name,
        category: name,
        start,
        end,
        count,
      };
    });

    return { groupMode: 'category', groups };
  }

  return {
    groupMode: 'fixed',
    groups: buildGroups(words.length, moduleName, moduleSlug),
  };
}

export function wordIdsForGroup(
  words: { id: number; english: string; category: string | null }[],
  groupIndex: number,
  groupMode: GroupMode,
  groups: WordGroupInfo[]
): number[] {
  const g = Math.max(1, groupIndex);
  if (groupMode === 'category') {
    const info = groups.find((x) => x.index === g);
    if (!info?.category) return [];
    return mixWordsByLetter(
      words.filter((w) => w.category === info.category)
    ).map((w) => w.id);
  }
  const mixed = mixWordsByLetter(words);
  const start = (g - 1) * GROUP_SIZE;
  return mixed.slice(start, start + GROUP_SIZE).map((w) => w.id);
}

/** API: bir grubun kelimelerini getir */
export async function findWordsForGroup(params: {
  moduleId: number;
  groupIndex: number;
  includeModule?: boolean;
}) {
  const include = params.includeModule
    ? { module: { select: { id: true, slug: true, name: true } } }
    : undefined;

  const all = await prisma.word.findMany({
    where: { moduleId: params.moduleId },
    orderBy: { id: 'asc' },
    include,
  });

  const mod = await prisma.module.findUnique({
    where: { id: params.moduleId },
    select: { name: true, slug: true },
  });
  if (!mod) return { words: [] as never[], meta: null };

  const meta = buildModuleGroups({
    words: all,
    moduleName: mod.name,
    moduleSlug: mod.slug,
  });

  const groupIndex = Math.max(1, params.groupIndex);

  if (meta.groupMode === 'category') {
    const info = meta.groups.find((g) => g.index === groupIndex);
    if (!info?.category) {
      return { words: [], meta };
    }
    const result = mixWordsByLetter(
      all.filter((w) => w.category === info.category)
    );
    return { words: result, meta };
  }

  const mixed = mixWordsByLetter(all);
  const start = (groupIndex - 1) * GROUP_SIZE;
  return { words: mixed.slice(start, start + GROUP_SIZE), meta };
}
