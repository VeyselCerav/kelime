/** Ödev modülü — günlük 25 kelime, id sırası, kısıtlı görünürlük */

export const ODEV_SLUG = 'odev';
export const ODEV_NAME = 'Ödev';
export const ODEV_WORDS_PER_DAY = 25;

export function isOdevSlug(slug?: string | null): boolean {
  return slug === ODEV_SLUG;
}

/** JSON id (1-based) → Gün-1, Gün-2… */
export function odevDayLabel(jsonId: number): string {
  const day = Math.ceil(jsonId / ODEV_WORDS_PER_DAY);
  return `Gün-${day}`;
}
