/** Ezberlenmeyen ×3, ezberlenen ×1 ağırlıklı rastgele sıra */

export type WeightedItem = {
  id: number;
  isLearned?: boolean;
};

/**
 * Ağırlıklı rastgele örnekleme (replacement yok).
 * Her adımda kalan elemanlardan weight’e göre seçer.
 */
export function weightedShuffle<T extends WeightedItem>(items: T[]): T[] {
  if (items.length <= 1) return [...items];

  const pool = items.map((item) => ({
    item,
    weight: item.isLearned ? 1 : 3,
  }));

  const result: T[] = [];
  while (pool.length > 0) {
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx].weight;
      if (r <= 0) break;
    }
    if (idx >= pool.length) idx = pool.length - 1;
    result.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return result;
}
