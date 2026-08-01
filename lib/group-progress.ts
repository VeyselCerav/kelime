import { GROUP_SIZE, groupLabel, moduleShortName } from '@/lib/subgroups';
import { buildModuleGroups, wordIdsForGroup } from '@/lib/module-groups';

export interface ScopeProgress {
  moduleId: number;
  groupIndex: number;
  total: number;
  learned: number;
  unlearned: number;
  percentage: number;
  label: string;
  complete: boolean;
}

export interface CompletedGroup {
  moduleId: number;
  moduleSlug: string;
  moduleName: string;
  groupIndex: number;
  label: string;
  wordCount: number;
}

/** Modül kelime id listesinden (id ASC) grup dilimini al — sabit 20’lik */
export function sliceGroupIds(wordIdsAsc: number[], groupIndex: number): number[] {
  const g = Math.max(1, groupIndex);
  const start = (g - 1) * GROUP_SIZE;
  return wordIdsAsc.slice(start, start + GROUP_SIZE);
}

export function computeScopeProgress(params: {
  moduleId: number;
  moduleName: string;
  moduleSlug: string;
  groupIndex: number;
  words: { id: number; category: string | null }[];
  learnedIdSet: Set<number>;
}): ScopeProgress {
  const meta = buildModuleGroups({
    words: params.words,
    moduleName: params.moduleName,
    moduleSlug: params.moduleSlug,
  });
  const ids = wordIdsForGroup(
    params.words,
    params.groupIndex,
    meta.groupMode,
    meta.groups
  );
  const learned = ids.filter((id) => params.learnedIdSet.has(id)).length;
  const total = ids.length;
  const groupInfo = meta.groups.find((g) => g.index === params.groupIndex);
  const short = moduleShortName(params.moduleName, params.moduleSlug);
  const label =
    groupInfo?.label ??
    (meta.groupMode === 'fixed'
      ? groupLabel(short, params.groupIndex)
      : short);

  return {
    moduleId: params.moduleId,
    groupIndex: params.groupIndex,
    total,
    learned,
    unlearned: Math.max(0, total - learned),
    percentage: total === 0 ? 0 : Math.round((learned / total) * 100),
    label,
    complete: total > 0 && learned === total,
  };
}

/** Kullanıcının tamamen ezberlediği alt gruplar */
export function findCompletedGroups(params: {
  modules: {
    id: number;
    slug: string;
    name: string;
    words: { id: number; category: string | null }[];
  }[];
  learnedIdSet: Set<number>;
}): CompletedGroup[] {
  const out: CompletedGroup[] = [];
  for (const mod of params.modules) {
    const meta = buildModuleGroups({
      words: mod.words,
      moduleName: mod.name,
      moduleSlug: mod.slug,
    });
    for (const g of meta.groups) {
      const ids = wordIdsForGroup(
        mod.words,
        g.index,
        meta.groupMode,
        meta.groups
      );
      if (ids.length === 0) continue;
      if (ids.every((id) => params.learnedIdSet.has(id))) {
        out.push({
          moduleId: mod.id,
          moduleSlug: mod.slug,
          moduleName: mod.name,
          groupIndex: g.index,
          label: g.label,
          wordCount: ids.length,
        });
      }
    }
  }
  return out;
}
