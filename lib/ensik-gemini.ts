import * as fs from 'fs';
import * as path from 'path';

export const MODULE_SLUG = 'en-sik-cikan';
export const PROMPT_TAG = 'gemini-cartoon:';
export const COMFY_PROMPT_TAG = 'comfyui-dreamshaper:';
export const GEMINI_GRID_PROMPT_TAG = 'gemini-grid:';

export function imagePromptTagForItem(item: EnsikManifestItem): string {
  if (item.model === 'gemini-grid' || item.model?.includes('gemini-grid')) {
    return GEMINI_GRID_PROMPT_TAG;
  }
  if (
    item.model?.toLowerCase().includes('dreamshaper') ||
    item.model?.toLowerCase().includes('comfy')
  ) {
    return COMFY_PROMPT_TAG;
  }
  return PROMPT_TAG;
}
export const ENSIK_GEMINI_PUBLIC_DIR = 'ensik-gemini';

export const ENSIK_GEMINI_OUT_DIR = path.join(
  process.cwd(),
  'public',
  ENSIK_GEMINI_PUBLIC_DIR
);

export const ENSIK_GEMINI_MANIFEST_PATH = path.join(
  process.cwd(),
  'imageCollector',
  'out',
  'ensik-gemini-manifest.json'
);

export function buildEnsikGeminiPrompt(english: string, turkish: string): string {
  return `${english} (${turkish}) kelimesinin anlamını tasvir eden cartoon tarzı görsel oluştur. Herhangi bir yazı olmasın, sadece ilgili kelimenin anlamı tasvir edilecek.`;
}

export function ensikGeminiImagePath(id: number, dir = ENSIK_GEMINI_OUT_DIR): string | null {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const p = path.join(dir, `${id}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function ensikGeminiImageUrl(fileName: string): string {
  return `/${ENSIK_GEMINI_PUBLIC_DIR}/${fileName}`;
}

export type EnsikManifestItem = {
  id: number;
  english: string;
  turkish: string;
  status: 'ok' | 'failed' | 'db_applied';
  file?: string;
  model?: string;
  prompt?: string;
  error?: string;
  db_applied_at?: string;
};

export type EnsikManifest = {
  updated_at: string;
  module_slug: string;
  items: EnsikManifestItem[];
};

export function loadEnsikGeminiManifest(): EnsikManifest {
  if (fs.existsSync(ENSIK_GEMINI_MANIFEST_PATH)) {
    const raw = JSON.parse(
      fs.readFileSync(ENSIK_GEMINI_MANIFEST_PATH, 'utf8')
    ) as EnsikManifest;
    // Eski word-images skip kayıtlarını at
    raw.items = (raw.items || []).filter(
      (x) => (x as { status?: string }).status !== 'skipped_exists'
    );
    return raw;
  }
  return { updated_at: '', module_slug: MODULE_SLUG, items: [] };
}

export function saveEnsikGeminiManifest(manifest: EnsikManifest) {
  fs.mkdirSync(path.dirname(ENSIK_GEMINI_MANIFEST_PATH), { recursive: true });
  manifest.updated_at = new Date().toISOString();
  fs.writeFileSync(
    ENSIK_GEMINI_MANIFEST_PATH,
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
}

export function manifestHasGeminiFile(
  manifest: EnsikManifest,
  id: number
): boolean {
  const item = manifest.items.find((x) => x.id === id);
  if (!item || (item.status !== 'ok' && item.status !== 'db_applied')) {
    return false;
  }
  const file = item.file || `${id}.jpg`;
  return fs.existsSync(path.join(ENSIK_GEMINI_OUT_DIR, file));
}
