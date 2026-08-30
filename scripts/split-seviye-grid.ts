/**
 * Seviye Seviye — 10×10 grid JPEG’lerini kelime id’lerine kırp.
 *
 * PowerShell:
 *   npm run split-seviye-grid
 *   npm run split-seviye-grid -- --level=A1
 *   npm run split-seviye-grid -- --level=A1 --batch=1 --dry-run
 */
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import {
  SEVIYE_GEMINI_OUT_DIR,
  SEVIYE_GRID_IN_DIR,
  SEVIYE_MODULE_SLUG,
  buildSeviyeGeminiPrompt,
  loadSeviyeGeminiManifest,
  saveSeviyeGeminiManifest,
  type SeviyeManifestItem,
} from '../lib/seviye-gemini';
import {
  WORD_CARD_IMAGE_HEIGHT,
  WORD_CARD_IMAGE_WIDTH,
} from '../lib/word-image-url';

const COLS = 10;
const ROWS = 10;
const GRID_MODEL = 'gemini-grid';

type JsonWord = {
  pos: number;
  id: number;
  en?: string;
  english?: string;
  tr?: string;
  turkish?: string;
};

type BatchJson = {
  level: string;
  batch: number;
  words: JsonWord[];
};

function argValue(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function cellBounds(
  imgW: number,
  imgH: number,
  col: number,
  row: number,
  trim: number
) {
  const left = Math.round((col * imgW) / COLS) + trim;
  const right = Math.round(((col + 1) * imgW) / COLS) - trim;
  const top = Math.round((row * imgH) / ROWS) + trim;
  const bottom = Math.round(((row + 1) * imgH) / ROWS) - trim;
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function findGridFile(level: string, batch: number): string | null {
  const base = `seviye-${level}-${String(batch).padStart(2, '0')}`;
  for (const ext of ['.jpeg', '.jpg', '.png', '.webp']) {
    const p = path.join(SEVIYE_GRID_IN_DIR, `${base}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function listBatchJsons(levelFilter?: string): string[] {
  const dir = path.join(process.cwd(), 'imageCollector', 'out');
  return fs
    .readdirSync(dir)
    .filter((f) => /^seviye-(A1|A2|B1|B2)-\d{2}\.json$/.test(f))
    .filter((f) => (levelFilter ? f.startsWith(`seviye-${levelFilter}-`) : true))
    .sort();
}

function upsertManifest(
  manifest: ReturnType<typeof loadSeviyeGeminiManifest>,
  item: SeviyeManifestItem
) {
  const i = manifest.items.findIndex((x) => x.id === item.id);
  if (i >= 0) manifest.items[i] = item;
  else manifest.items.push(item);
}

async function splitOne(
  jsonPath: string,
  trim: number,
  dryRun: boolean,
  manifest: ReturnType<typeof loadSeviyeGeminiManifest>
): Promise<number> {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as BatchJson;
  const level = data.level;
  const batch = data.batch;
  const words = data.words;
  const gridPath = findGridFile(level, batch);
  if (!gridPath) {
    throw new Error(
      `Grid yok: public/seviyeseviyebutun/seviye-${level}-${String(batch).padStart(2, '0')}.jpeg`
    );
  }

  const meta = await sharp(gridPath).metadata();
  const imgW = meta.width;
  const imgH = meta.height;
  if (!imgW || !imgH) throw new Error(`Boyut okunamadı: ${gridPath}`);

  const maxCells = COLS * ROWS;
  if (words.length > maxCells) {
    throw new Error(
      `${path.basename(jsonPath)}: ${words.length} kelime > ${maxCells} hücre`
    );
  }

  console.log(
    `\n${path.basename(jsonPath)} ← ${path.basename(gridPath)} (${imgW}×${imgH}) ${words.length} kelime`
  );

  if (!dryRun) {
    fs.mkdirSync(SEVIYE_GEMINI_OUT_DIR, { recursive: true });
  }

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const cellIndex = (w.pos ?? i + 1) - 1;
    const row = Math.floor(cellIndex / COLS);
    const col = cellIndex % COLS;
    const bounds = cellBounds(imgW, imgH, col, row, trim);
    const fileName = `${w.id}.jpg`;
    const outPath = path.join(SEVIYE_GEMINI_OUT_DIR, fileName);
    const english = w.english ?? w.en ?? '';
    const turkish = w.turkish ?? w.tr ?? '';

    if (dryRun) continue;

    await sharp(gridPath)
      .extract(bounds)
      .resize(WORD_CARD_IMAGE_WIDTH, WORD_CARD_IMAGE_HEIGHT, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(outPath);

    upsertManifest(manifest, {
      id: w.id,
      english,
      turkish,
      level,
      batch,
      status: 'ok',
      file: fileName,
      model: GRID_MODEL,
      prompt: buildSeviyeGeminiPrompt(english, turkish),
    });
  }

  if (!dryRun && words.length % 100 === 0) {
    saveSeviyeGeminiManifest(manifest);
  }

  return words.length;
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const level = argValue('level')?.trim().toUpperCase();
  const batchArg = argValue('batch')
    ? parseInt(argValue('batch')!, 10)
    : undefined;
  const trim = Math.max(0, parseInt(argValue('trim') || '1', 10) || 0);

  let files = listBatchJsons(level);
  if (batchArg != null) {
    const pad = String(batchArg).padStart(2, '0');
    files = files.filter((f) => f.includes(`-${pad}.json`));
  }
  if (files.length === 0) {
    throw new Error('JSON bulunamadı. Önce: npm run export-seviye-grids');
  }

  const manifest = loadSeviyeGeminiManifest();
  manifest.module_slug = SEVIYE_MODULE_SLUG;

  let total = 0;
  const jsonDir = path.join(process.cwd(), 'imageCollector', 'out');
  for (const f of files) {
    total += await splitOne(path.join(jsonDir, f), trim, dryRun, manifest);
  }

  if (!dryRun) {
    saveSeviyeGeminiManifest(manifest);
    const n = fs
      .readdirSync(SEVIYE_GEMINI_OUT_DIR)
      .filter((x) => /^\d+\.jpe?g$/i.test(x)).length;
    console.log(`\nKaydedildi: public/seviye-gemini/ (${n} dosya)`);
    console.log(`Manifest: imageCollector/out/seviye-gemini-manifest.json`);
  }

  console.log(`\nBitti. kelime=${total}${dryRun ? ' (dry-run)' : ''}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
