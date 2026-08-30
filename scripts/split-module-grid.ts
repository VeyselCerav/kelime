/**
 * public/imagesnew 10×10 grid → public/modul-gemini/{id}.jpg (kart 3:4 = 600×800)
 *
 * PowerShell:
 *   npm run split-module-grid
 *   npm run split-module-grid -- --prefix=genel
 *   npm run split-module-grid -- --dry-run
 */
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import {
  MODUL_FILE_PREFIX_TO_SLUG,
  MODUL_GEMINI_OUT_DIR,
  MODUL_GRID_IN_DIR,
  buildModulGeminiPrompt,
  loadModulGeminiManifest,
  saveModulGeminiManifest,
  type ModulManifestItem,
} from '../lib/modul-gemini';
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
  module: string;
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

function listPairs(prefixFilter?: string): Array<{
  jsonPath: string;
  gridPath: string;
  base: string;
  prefix: string;
}> {
  const jsonDir = path.join(process.cwd(), 'imageCollector', 'out');
  const prefixes = Object.keys(MODUL_FILE_PREFIX_TO_SLUG);
  const re = new RegExp(
    `^(${prefixes.join('|')})-(\\d{2})\\.json$`
  );
  const out: Array<{
    jsonPath: string;
    gridPath: string;
    base: string;
    prefix: string;
  }> = [];

  for (const f of fs.readdirSync(jsonDir).sort()) {
    const m = f.match(re);
    if (!m) continue;
    const prefix = m[1];
    if (prefixFilter && prefix !== prefixFilter) continue;
    const base = f.replace(/\.json$/, '');
    let gridPath: string | null = null;
    for (const ext of ['.jpeg', '.jpg', '.png', '.webp']) {
      const p = path.join(MODUL_GRID_IN_DIR, `${base}${ext}`);
      if (fs.existsSync(p)) {
        gridPath = p;
        break;
      }
    }
    if (!gridPath) {
      console.warn(`Grid yok, atlandı: ${base}.*`);
      continue;
    }
    out.push({
      jsonPath: path.join(jsonDir, f),
      gridPath,
      base,
      prefix,
    });
  }
  return out;
}

function upsertManifest(
  manifest: ReturnType<typeof loadModulGeminiManifest>,
  item: ModulManifestItem
) {
  const i = manifest.items.findIndex((x) => x.id === item.id);
  if (i >= 0) manifest.items[i] = item;
  else manifest.items.push(item);
}

async function splitOne(
  pair: { jsonPath: string; gridPath: string; base: string; prefix: string },
  trim: number,
  dryRun: boolean,
  manifest: ReturnType<typeof loadModulGeminiManifest>
): Promise<number> {
  const data = JSON.parse(fs.readFileSync(pair.jsonPath, 'utf8')) as BatchJson;
  const words = data.words;
  const moduleSlug =
    data.module || MODUL_FILE_PREFIX_TO_SLUG[pair.prefix] || pair.prefix;

  const meta = await sharp(pair.gridPath).metadata();
  const imgW = meta.width;
  const imgH = meta.height;
  if (!imgW || !imgH) throw new Error(`Boyut okunamadı: ${pair.gridPath}`);

  if (words.length > COLS * ROWS) {
    throw new Error(`${pair.base}: ${words.length} kelime > 100 hücre`);
  }

  console.log(
    `\n${pair.base}: ${path.basename(pair.gridPath)} (${imgW}×${imgH}) → ${words.length} kelime → 600×800`
  );

  if (!dryRun) fs.mkdirSync(MODUL_GEMINI_OUT_DIR, { recursive: true });

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const cellIndex = (w.pos ?? i + 1) - 1;
    const row = Math.floor(cellIndex / COLS);
    const col = cellIndex % COLS;
    const bounds = cellBounds(imgW, imgH, col, row, trim);
    const fileName = `${w.id}.jpg`;
    const outPath = path.join(MODUL_GEMINI_OUT_DIR, fileName);
    const english = w.english ?? w.en ?? '';
    const turkish = w.turkish ?? w.tr ?? '';

    if (dryRun) continue;

    // Kart aspect-[3/4]: cover + centre → mobilde kenar taşması yok
    await sharp(pair.gridPath)
      .extract(bounds)
      .resize(WORD_CARD_IMAGE_WIDTH, WORD_CARD_IMAGE_HEIGHT, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(outPath);

    upsertManifest(manifest, {
      id: w.id,
      english,
      turkish,
      module_slug: moduleSlug,
      batch_file: pair.base,
      status: 'ok',
      file: fileName,
      model: GRID_MODEL,
      prompt: buildModulGeminiPrompt(english, turkish),
    });
  }

  return words.length;
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const prefix = argValue('prefix')?.trim();
  const trim = Math.max(0, parseInt(argValue('trim') || '2', 10) || 0);

  const pairs = listPairs(prefix);
  if (pairs.length === 0) {
    throw new Error(
      'JSON/grid çifti yok. imagesnew + imageCollector/out eşleşmeli.'
    );
  }

  const manifest = loadModulGeminiManifest();
  let total = 0;
  for (const pair of pairs) {
    total += await splitOne(pair, trim, dryRun, manifest);
  }

  if (!dryRun) {
    saveModulGeminiManifest(manifest);
    const n = fs
      .readdirSync(MODUL_GEMINI_OUT_DIR)
      .filter((x) => /^\d+\.jpe?g$/i.test(x)).length;
    console.log(`\nKaydedildi: public/modul-gemini/ (${n} dosya)`);
  }

  console.log(`\nBitti. kelime=${total}${dryRun ? ' (dry-run)' : ''}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
