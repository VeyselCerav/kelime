import * as fs from 'fs';
import * as path from 'path';

export const SEVIYE_MODULE_SLUG = 'seviye-seviye';
export const SEVIYE_GEMINI_PUBLIC_DIR = 'seviye-gemini';
export const SEVIYE_GRID_PROMPT_TAG = 'gemini-grid:';

export const SEVIYE_GEMINI_OUT_DIR = path.join(
  process.cwd(),
  'public',
  SEVIYE_GEMINI_PUBLIC_DIR
);

export const SEVIYE_GRID_IN_DIR = path.join(
  process.cwd(),
  'public',
  'seviyeseviyebutun'
);

export const SEVIYE_GEMINI_MANIFEST_PATH = path.join(
  process.cwd(),
  'imageCollector',
  'out',
  'seviye-gemini-manifest.json'
);

export function seviyeGeminiImageUrl(fileName: string): string {
  return `/${SEVIYE_GEMINI_PUBLIC_DIR}/${fileName}`;
}

export function seviyeGeminiImagePath(
  id: number,
  dir = SEVIYE_GEMINI_OUT_DIR
): string | null {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const p = path.join(dir, `${id}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function buildSeviyeGeminiPrompt(english: string, turkish: string): string {
  return `${english} (${turkish}) kelimesinin anlamını tasvir eden cartoon tarzı görsel. Yazı olmasın.`;
}

export type SeviyeManifestItem = {
  id: number;
  english: string;
  turkish: string;
  level: string;
  batch: number;
  status: 'ok' | 'failed' | 'db_applied';
  file?: string;
  model?: string;
  prompt?: string;
  db_applied_at?: string;
};

export type SeviyeManifest = {
  updated_at: string;
  module_slug: string;
  items: SeviyeManifestItem[];
};

export function loadSeviyeGeminiManifest(): SeviyeManifest {
  if (fs.existsSync(SEVIYE_GEMINI_MANIFEST_PATH)) {
    return JSON.parse(
      fs.readFileSync(SEVIYE_GEMINI_MANIFEST_PATH, 'utf8')
    ) as SeviyeManifest;
  }
  return {
    updated_at: '',
    module_slug: SEVIYE_MODULE_SLUG,
    items: [],
  };
}

export function saveSeviyeGeminiManifest(manifest: SeviyeManifest) {
  fs.mkdirSync(path.dirname(SEVIYE_GEMINI_MANIFEST_PATH), { recursive: true });
  manifest.updated_at = new Date().toISOString();
  fs.writeFileSync(
    SEVIYE_GEMINI_MANIFEST_PATH,
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
}
