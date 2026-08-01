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
  isLoading: boolean;
  refreshModules: () => Promise<void>;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);
const STORAGE_MODULE = 'yds-selected-module-id';
const STORAGE_GROUP = 'yds-selected-group-index';

export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [selectedModuleId, setSelectedModuleIdState] = useState<number | null>(null);
  const [selectedGroupIndex, setSelectedGroupIndexState] = useState(1);
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
    const stored = Number(localStorage.getItem(STORAGE_GROUP));
    if (!Number.isNaN(stored) && stored >= 1) {
      setSelectedGroupIndexState(stored);
    }
  }, []);

  const selectedModule = modules.find((m) => m.id === selectedModuleId) ?? null;

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

  useEffect(() => {
    if (!groups.length) return;
    if (selectedGroupIndex > groups.length) {
      setSelectedGroupIndexState(1);
      localStorage.setItem(STORAGE_GROUP, '1');
    }
  }, [groups, selectedGroupIndex]);

  const setSelectedModuleId = (id: number) => {
    setSelectedModuleIdState(id);
    setSelectedGroupIndexState(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_MODULE, String(id));
      localStorage.setItem(STORAGE_GROUP, '1');
    }
  };

  const setSelectedGroupIndex = (index: number) => {
    setSelectedGroupIndexState(index);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_GROUP, String(index));
    }
  };

  const selectedGroup = groups.find((g) => g.index === selectedGroupIndex) ?? groups[0] ?? null;

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
