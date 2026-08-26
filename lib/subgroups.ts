export const GROUP_SIZE = 20;

/** Modül adından kısa etiket */
export function moduleShortName(name: string, slug?: string): string {
  if (slug === 'genel') return 'Genel';
  if (slug === 'en-sik-cikan') return 'En Sık Çıkan';
  if (slug === 'tense-anahtar') return 'Tense';
  if (slug === 'seviye-seviye') return 'Seviye Seviye';
  if (name.toLowerCase().includes('sık')) return 'En Sık Çıkan';
  if (name.toLowerCase().includes('genel')) return 'Genel';
  if (name.toLowerCase().includes('tense')) return 'Tense';
  if (name.toLowerCase().includes('seviye')) return 'Seviye Seviye';
  return name.replace(/\s+Kelimeler$/i, '').trim() || name;
}

export function groupLabel(shortName: string, groupIndex: number): string {
  return `${shortName} · Grup ${groupIndex}`;
}

export function groupCountFromTotal(total: number): number {
  if (total <= 0) return 0;
  return Math.ceil(total / GROUP_SIZE);
}

export interface WordGroupInfo {
  index: number;
  label: string;
  start: number; // 1-based inclusive
  end: number; // 1-based inclusive
  count: number;
  /** Named subgroup (e.g. tense name); absent for fixed 20-word groups */
  category?: string;
}

export function buildGroups(
  total: number,
  moduleName: string,
  slug?: string
): WordGroupInfo[] {
  const short = moduleShortName(moduleName, slug);
  const n = groupCountFromTotal(total);
  const groups: WordGroupInfo[] = [];
  for (let i = 1; i <= n; i++) {
    const start = (i - 1) * GROUP_SIZE + 1;
    const end = Math.min(i * GROUP_SIZE, total);
    groups.push({
      index: i,
      label: groupLabel(short, i),
      start,
      end,
      count: end - start + 1,
    });
  }
  return groups;
}

/** Prisma skip/take for group index (1-based) */
export function groupPagination(groupIndex: number) {
  const index = Math.max(1, groupIndex);
  return {
    skip: (index - 1) * GROUP_SIZE,
    take: GROUP_SIZE,
  };
}
