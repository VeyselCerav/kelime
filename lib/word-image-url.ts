/** Harici CDN (R2/Blob) URL → same-origin /word-images/… (mobil SW uyumu). */
export function resolveWordImageUrl(
  url: string | null | undefined
): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('/word-images/')) return u;

  const m = u.match(/\/word-images\/(\d+\.jpe?g)(?:\?.*)?$/i);
  if (m) return `/word-images/${m[1]}`;

  return u;
}
