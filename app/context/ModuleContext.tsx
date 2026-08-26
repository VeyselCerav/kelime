'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  buildGroups,
  WordGroupInfo,
} from '@/lib/subgroups';

export interface ModuleInfo {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  wordCount: number;
  groupCount?: number;
  groupMode?: 'fixed' | 'category';
  groups?: WordGroupInfo[];
}

interface ModuleContextType {
  modules: ModuleInfo[];
  selectedModule: ModuleInfo | null;
  selectedModuleId: number | null;
  setSelectedModuleId: (id: number) => void;
  selectedGroupIndex: number;
  setSelectedGroupIndex: (index: number) => void;
  groups: WordGroupInfo[];
  selectedGroup: WordGroupInfo | null;
  unlearnedOnly: boolean;
  setUnlearnedOnly: (value: boolean) => void;
  isLoading: boolean;
  refreshModules: () => Promise<void>;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);
const STORAGE_MODULE = 'yds-selected-module-id';
/** Eski tek anahtar — ilk yüklemede migrate edilir */
const STORAGE_GROUP_LEGACY = 'yds-selected-group-index';
/** Modül başına kaldığın grup: { "2": 34, "1": 3 } */
const STORAGE_GROUPS_BY_MODULE = 'yds-group-by-module';
const STORAGE_UNLEARNED = 'yds-unlearned-only';

function readGroupMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_GROUPS_BY_MODULE);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        const n = Number(v);
        if (!Number.isNaN(n) && n >= 1) out[k] = n;
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function writeGroupMap(map: Record<string, number>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_GROUPS_BY_MODULE, JSON.stringify(map));
}

function groupForModule(moduleId: number, maxGroup?: number): number {
  const map = readGroupMap();
  let g = map[String(moduleId)] ?? 1;
  if (maxGroup && g > maxGroup) g = 1;
  return Math.max(1, g);
}

function saveGroupForModule(moduleId: number, groupIndex: number) {
  const map = readGroupMap();
  map[String(moduleId)] = groupIndex;
  writeGroupMap(map);
  localStorage.setItem(STORAGE_GROUP_LEGACY, String(groupIndex));
}

export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [selectedModuleId, setSelectedModuleIdState] = useState<number | null>(
    null
  );
  const [selectedGroupIndex, setSelectedGroupIndexState] = useState(1);
  const [unlearnedOnly, setUnlearnedOnlyState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshModules = useCallback(async () => {
    try {
      const res = await fetch('/api/modules');
      if (!res.ok) throw new Error('Modüller alınamadı');
      const data: ModuleInfo[] = await res.json();
      setModules(data);

      setSelectedModuleIdState((prev) => {
        if (prev && data.some((m) => m.id === prev)) return prev;
        const stored =
          typeof window !== 'undefined'
            ? Number(localStorage.getItem(STORAGE_MODULE))
            : NaN;
        if (!Number.isNaN(stored) && data.some((m) => m.id === stored)) {
          return stored;
        }
        return data[0]?.id ?? null;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshModules();
  }, [refreshModules]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Eski tek grup anahtarını aktif modüle taşı
    const map = readGroupMap();
    const legacy = Number(localStorage.getItem(STORAGE_GROUP_LEGACY));
    const modId = Number(localStorage.getItem(STORAGE_MODULE));
    if (
      !Number.isNaN(legacy) &&
      legacy >= 1 &&
      !Number.isNaN(modId) &&
      map[String(modId)] == null
    ) {
      map[String(modId)] = legacy;
      writeGroupMap(map);
    }
    setUnlearnedOnlyState(localStorage.getItem(STORAGE_UNLEARNED) === '1');
  }, []);

  const selectedModule =
    modules.find((m) => m.id === selectedModuleId) ?? null;

  const groups = useMemo(() => {
    if (!selectedModule) return [];
    if (selectedModule.groups && selectedModule.groups.length > 0) {
      return selectedModule.groups;
    }
    return buildGroups(
      selectedModule.wordCount,
      selectedModule.name,
      selectedModule.slug
    );
  }, [selectedModule]);

  // Modül değişince o modülde kaldığın grubu yükle
  useEffect(() => {
    if (!selectedModuleId || !groups.length) return;
    const restored = groupForModule(selectedModuleId, groups.length);
    setSelectedGroupIndexState(restored);
  }, [selectedModuleId, groups.length]);

  useEffect(() => {
    if (!groups.length) return;
    if (selectedGroupIndex > groups.length) {
      setSelectedGroupIndexState(1);
      if (selectedModuleId) saveGroupForModule(selectedModuleId, 1);
    }
  }, [groups, selectedGroupIndex, selectedModuleId]);

  const setSelectedModuleId = (id: number) => {
    setSelectedModuleIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_MODULE, String(id));
    }
    // Grup index’i useEffect ile o modülün kaydından gelecek
  };

  const setSelectedGroupIndex = (index: number) => {
    setSelectedGroupIndexState(index);
    if (selectedModuleId != null) {
      saveGroupForModule(selectedModuleId, index);
    }
  };

  const setUnlearnedOnly = (value: boolean) => {
    setUnlearnedOnlyState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_UNLEARNED, value ? '1' : '0');
    }
  };

  const selectedGroup =
    groups.find((g) => g.index === selectedGroupIndex) ?? groups[0] ?? null;

  return (
    <ModuleContext.Provider
      value={{
        modules,
        selectedModule,
        selectedModuleId,
        setSelectedModuleId,
        selectedGroupIndex: selectedGroup?.index ?? 1,
        setSelectedGroupIndex,
        groups,
        selectedGroup,
        unlearnedOnly,
        setUnlearnedOnly,
        isLoading,
        refreshModules,
      }}
    >
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  const ctx = useContext(ModuleContext);
  if (!ctx) {
    throw new Error('useModule must be used within ModuleProvider');
  }
  return ctx;
}
