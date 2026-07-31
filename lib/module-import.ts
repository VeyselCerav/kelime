/** Modül JSON import yardımcıları */

export type ParsedWord = { english: string; turkish: string };

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

/**
 * Desteklenen formatlar:
 * - { entries: [{ word|english, turkish|tr }] }
 * - [{ english|word, turkish|tr }]
 */
export function parseWordJson(data: unknown): ParsedWord[] {
  let list: unknown[] = [];

  if (Array.isArray(data)) {
    list = data;
  } else if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { entries?: unknown }).entries)
  ) {
    list = (data as { entries: unknown[] }).entries;
  } else {
    throw new Error(
      'JSON formatı geçersiz. Beklenen: { "entries": [...] } veya [ ... ]'
    );
  }

  const out: ParsedWord[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const engRaw = row.word ?? row.english ?? row.en;
    const trRaw = row.turkish ?? row.tr ?? row.meaning ?? row.translation;
    if (typeof engRaw !== 'string' || typeof trRaw !== 'string') continue;
    const english = engRaw.trim();
    const turkish = trRaw.trim();
    if (!english || !turkish) continue;
    const key = english.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ english, turkish });
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
