/** İlk harfe göre kova; her 20’lik grupta mümkün olduğunca farklı harf */

export function firstLetter(english: string): string {
  const ch = english.trim().charAt(0).toUpperCase();
  if (ch >= 'A' && ch <= 'Z') return ch;
  return '#';
}

/**
 * Harf kovalarından dönüşümlü seçer (A1, B1, C1…).
 * Böylece peş peşe 20 kelimede harf çeşitliliği artar; sıra deterministiktir.
 */
export function mixWordsByLetter<T extends { id: number; english: string }>(
  words: T[]
): T[] {
  if (words.length <= 1) return [...words];

  const buckets = new Map<string, T[]>();
  for (const w of words) {
    const letter = firstLetter(w.english);
    const list = buckets.get(letter);
    if (list) list.push(w);
    else buckets.set(letter, [w]);
  }

  Array.from(buckets.values()).forEach((list) => {
    list.sort((a, b) => a.id - b.id);
  });

  const letters = Array.from(buckets.keys()).sort((a, b) =>
    a.localeCompare(b)
  );
  const index = new Map(letters.map((l) => [l, 0]));
  const result: T[] = [];
  let remaining = words.length;

  while (remaining > 0) {
    for (const letter of letters) {
      const list = buckets.get(letter);
      if (!list) continue;
      const i = index.get(letter) ?? 0;
      if (i < list.length) {
        result.push(list[i]);
        index.set(letter, i + 1);
        remaining--;
      }
    }
  }

  return result;
}
