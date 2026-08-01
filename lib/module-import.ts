/** Modül JSON import yardımcıları */

export type ParsedWord = {
  english: string;
  turkish: string;
  category?: string;
};

/** Türkçe karakterleri slug’a çevir */
export function slugifyModuleName(name: string): string {
  const map: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    İ: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
    Ç: 'c',
    Ğ: 'g',
    Ö: 'o',
    Ş: 's',
    Ü: 'u',
  };
  const base = name
    .trim()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'modul';
}

function pushWord(
  out: ParsedWord[],
  seen: Set<string>,
  engRaw: unknown,
  trRaw: unknown,
  category?: string
) {
  if (typeof engRaw !== 'string' || typeof trRaw !== 'string') return;
  const english = engRaw.trim();
  const turkish = trRaw.trim();
  if (!english || !turkish) return;
  const key = `${category ?? ''}::${english.toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(category ? { english, turkish, category } : { english, turkish });
}

function parseRowList(
  list: unknown[],
  out: ParsedWord[],
  seen: Set<string>,
  category?: string
) {
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    pushWord(
      out,
      seen,
      row.word ?? row.english ?? row.en,
      row.turkish ?? row.tr ?? row.meaning ?? row.translation,
      category
    );
  }
}

/**
 * Desteklenen formatlar:
 * - { entries: [{ word|english, turkish|tr }] }
 * - [{ english|word, turkish|tr }]
 * - { "Tense Name": [{ english, turkish }, ...], ... }  (kategorili)
 */
export function parseWordJson(data: unknown): ParsedWord[] {
  const out: ParsedWord[] = [];
  const seen = new Set<string>();

  if (Array.isArray(data)) {
    parseRowList(data, out, seen);
  } else if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { entries?: unknown }).entries)
  ) {
    parseRowList((data as { entries: unknown[] }).entries, out, seen);
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    const allArrays =
      keys.length > 0 && keys.every((k) => Array.isArray(obj[k]));

    if (!allArrays) {
      throw new Error(
        'JSON formatı geçersiz. Beklenen: { "entries": [...] }, [ ... ] veya { "Kategori": [...] }'
      );
    }

    for (const category of keys) {
      parseRowList(obj[category] as unknown[], out, seen, category);
    }
  } else {
    throw new Error(
      'JSON formatı geçersiz. Beklenen: { "entries": [...] }, [ ... ] veya { "Kategori": [...] }'
    );
  }

  if (out.length === 0) {
    throw new Error('JSON içinde geçerli kelime bulunamadı');
  }

  return out;
}

export const SYSTEM_MODULE_SLUGS = new Set(['genel', 'en-sik-cikan']);

export function isSystemModule(slug: string): boolean {
  return SYSTEM_MODULE_SLUGS.has(slug);
}
