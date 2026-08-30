import * as fs from 'fs';
import * as path from 'path';

export const MODUL_GEMINI_PUBLIC_DIR = 'modul-gemini';
export const MODUL_GRID_PROMPT_TAG = 'gemini-grid:';

export const MODUL_GEMINI_OUT_DIR = path.join(
  process.cwd(),
  'public',
  MODUL_GEMINI_PUBLIC_DIR
);

export const MODUL_GRID_IN_DIR = path.join(
  process.cwd(),
  'public',
  'imagesnew'
);

export const MODUL_GEMINI_MANIFEST_PATH = path.join(
  process.cwd(),
  'imageCollector',
  'out',
  'modul-gemini-manifest.json'
);

/** imagesnew batch öneki → module slug */
export const MODUL_FILE_PREFIX_TO_SLUG: Record<string, string> = {
  genel: 'genel',
  verb: 'en-cok-cikan-verb',
  sifatlar: 'en-sik-cikan-sifatlar',
  adverbs: 'en-sik-cikan-adverbs',
  tense: 'tense-anahtar',
};

export function modulGeminiImageUrl(fileName: string): string {
  return `/${MODUL_GEMINI_PUBLIC_DIR}/${fileName}`;
}

export function modulGeminiImagePath(
  id: number,
  dir = MODUL_GEMINI_OUT_DIR
): string | null {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const p = path.join(dir, `${id}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function buildModulGeminiPrompt(english: string, turkish: string): string {
  return `${english} (${turkish}) kelimesinin anlamını tasvir eden cartoon tarzı görsel. Yazı olmasın.`;
}

export type ModulManifestItem = {
  id: number;
  english: string;
  turkish: string;
  module_slug: string;
  batch_file: string;
  status: 'ok' | 'failed' | 'db_applied';
  file?: string;
  model?: string;
  prompt?: string;
  db_applied_at?: string;
};

export type ModulManifest = {
  updated_at: string;
  items: ModulManifestItem[];
};

export function loadModulGeminiManifest(): ModulManifest {
  if (fs.existsSync(MODUL_GEMINI_MANIFEST_PATH)) {
    return JSON.parse(
      fs.readFileSync(MODUL_GEMINI_MANIFEST_PATH, 'utf8')
    ) as ModulManifest;
  }
  return { updated_at: '', items: [] };
}

export function saveModulGeminiManifest(manifest: ModulManifest) {
  fs.mkdirSync(path.dirname(MODUL_GEMINI_MANIFEST_PATH), { recursive: true });
  manifest.updated_at = new Date().toISOString();
  fs.writeFileSync(
    MODUL_GEMINI_MANIFEST_PATH,
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
}
