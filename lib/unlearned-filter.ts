import { prisma } from '@/lib/prisma';

/**
 * Seçili listedeki ezberlenemeyen kelimeler.
 * Liste boşsa (veya quiz için 4’ten azsa) tüm listeye düşer.
 */
export async function filterUnlearnedOrFallback<T extends { id: number }>(
  words: T[],
  userId: number | null | undefined,
  unlearnedOnly: boolean,
  minCount = 1
): Promise<{ words: T[]; usedUnlearned: boolean }> {
  if (!unlearnedOnly || !userId || words.length === 0) {
    return { words, usedUnlearned: false };
  }

  const rows = await prisma.unlearnedWord.findMany({
    where: {
      userId,
      wordId: { in: words.map((w) => w.id) },
    },
    select: { wordId: true },
  });
  const set = new Set(rows.map((r) => r.wordId));
  const filtered = words.filter((w) => set.has(w.id));

  if (filtered.length < minCount) {
    return { words, usedUnlearned: false };
  }
  return { words: filtered, usedUnlearned: true };
}
