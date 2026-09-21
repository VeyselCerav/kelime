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
  'genel',
  'en-cok-cikan-verb',
  'en-sik-cikan-sifatlar',
  'en-sik-cikan-adverbs',
  'tense-anahtar',
  'irregular-verbs',
  'phrasal-verbs',
  'odev',
]);

/**
 * Görsel URL sürümü — R2 immutable cache kırıcı.
 * Görseller yenilendiğinde artır.
 */
export const WORD_IMAGE_CACHE_VERSION = '11';

function withImageCacheBust(path: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}v=${WORD_IMAGE_CACHE_VERSION}`;
}

/** Harici CDN (R2) URL → same-origin proxy (mobil SW uyumu). */
export function resolveWordImageUrl(
  url: string | null | undefined,
  moduleSlug?: string | null
): string | null {
  if (!WORD_CARD_IMAGES_ENABLED) return null;
  if (moduleSlug && !WORD_CARD_IMAGE_MODULE_SLUGS.has(moduleSlug)) return null;
  if (!url?.trim()) return null;
  const u = url.trim();

  let path: string | null = null;
  if (u.startsWith('/ensik-gemini/')) path = u.split('?')[0];
  else if (u.startsWith('/seviye-gemini/')) path = u.split('?')[0];
  else if (u.startsWith('/modul-gemini/')) path = u.split('?')[0];
  else {
    // id.jpg veya id-v123456.jpg (cache-bust dosya adları)
    const fileRe = '([\\w.-]+\\.jpe?g)';
    const ensik = u.match(new RegExp(`/ensik-gemini/${fileRe}(?:\\?.*)?$`, 'i'));
    if (ensik) path = `/ensik-gemini/${ensik[1]}`;
    else {
      const seviye = u.match(new RegExp(`/seviye-gemini/${fileRe}(?:\\?.*)?$`, 'i'));
      if (seviye) path = `/seviye-gemini/${seviye[1]}`;
      else {
        const modul = u.match(new RegExp(`/modul-gemini/${fileRe}(?:\\?.*)?$`, 'i'));
        if (modul) path = `/modul-gemini/${modul[1]}`;
      }
    }
  }

  return path ? withImageCacheBust(path) : null;
}
