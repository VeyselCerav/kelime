/**
 * Kelime kartı arka plan görselleri.
 * DB’de imageUrl varsa gösterilir. Kapatmak için NEXT_PUBLIC_WORD_CARD_IMAGES=0
 */
export const WORD_CARD_IMAGES_ENABLED =
  process.env.NEXT_PUBLIC_WORD_CARD_IMAGES !== '0' &&
  process.env.NEXT_PUBLIC_WORD_CARD_IMAGES !== 'false';

/** Kart yüzü aspect-[3/4] ile aynı — görsel dosya boyutu */
export const WORD_CARD_IMAGE_WIDTH = 600;
export const WORD_CARD_IMAGE_HEIGHT = 800;

/** Kart görseli gösterilen modüller */
export const WORD_CARD_IMAGE_MODULE_SLUGS = new Set([
  'en-sik-cikan',
  'seviye-seviye',
]);

/** Harici CDN (R2) URL → same-origin proxy (mobil SW uyumu). */
export function resolveWordImageUrl(
  url: string | null | undefined,
  moduleSlug?: string | null
): string | null {
  if (!WORD_CARD_IMAGES_ENABLED) return null;
  if (moduleSlug && !WORD_CARD_IMAGE_MODULE_SLUGS.has(moduleSlug)) return null;
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('/ensik-gemini/')) return u;
  if (u.startsWith('/seviye-gemini/')) return u;

  const ensik = u.match(/\/ensik-gemini\/(\d+\.jpe?g)(?:\?.*)?$/i);
  if (ensik) return `/ensik-gemini/${ensik[1]}`;

  const seviye = u.match(/\/seviye-gemini\/(\d+\.jpe?g)(?:\?.*)?$/i);
  if (seviye) return `/seviye-gemini/${seviye[1]}`;

  return null;
}
