import { GROUP_SIZE, groupLabel, moduleShortName } from '@/lib/subgroups';

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

/** Modül kelime id listesinden (id ASC) grup dilimini al */
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
  wordIdsAsc: number[];
  learnedIdSet: Set<number>;
}): ScopeProgress {
  const ids = sliceGroupIds(params.wordIdsAsc, params.groupIndex);
  const learned = ids.filter((id) => params.learnedIdSet.has(id)).length;
  const total = ids.length;
  const short = moduleShortName(params.moduleName, params.moduleSlug);
  return {
    moduleId: params.moduleId,
    groupIndex: params.groupIndex,
    total,
    learned,
    unlearned: Math.max(0, total - learned),
    percentage: total === 0 ? 0 : Math.round((learned / total) * 100),
    label: groupLabel(short, params.groupIndex),
    complete: total > 0 && learned === total,
  };
}

/** Kullanıcının tamamen ezberlediği alt gruplar */
export function findCompletedGroups(params: {
  modules: { id: number; slug: string; name: string; wordIdsAsc: number[] }[];
  learnedIdSet: Set<number>;
}): CompletedGroup[] {
  const out: CompletedGroup[] = [];
  for (const mod of params.modules) {
    const n = Math.ceil(mod.wordIdsAsc.length / GROUP_SIZE);
    const short = moduleShortName(mod.name, mod.slug);
    for (let g = 1; g <= n; g++) {
      const ids = sliceGroupIds(mod.wordIdsAsc, g);
      if (ids.length === 0) continue;
      if (ids.every((id) => params.learnedIdSet.has(id))) {
        out.push({
          moduleId: mod.id,
          moduleSlug: mod.slug,
          moduleName: mod.name,
          groupIndex: g,
          label: groupLabel(short, g),
          wordCount: ids.length,
        });
      }
    }
  }
  return out;
}
