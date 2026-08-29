/**
 * En Sık Çıkan — tek Gemini grid görselini 20 parçaya böl, kelime id'lerine ata.
 *
 * Grid düzeni: soldan sağa, yukarıdan aşağı (5 sütun × 4 satır = 20).
 *
 * zsh:
 *   npm run export-ensik-group -- --group=37
 *   npm run split-ensik-grid -- --group=37 --input=imageCollector/in/grids/grup-37.jpg
 *   npm run split-ensik-grid -- --group=37 --input=... --dry-run
 *   npm run split-ensik-grid -- --group=37 --input=... --trim=4 --format=jpg
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import {
  ENSIK_GEMINI_OUT_DIR,
  MODULE_SLUG,
  buildEnsikGeminiPrompt,
  loadEnsikGeminiManifest,
  saveEnsikGeminiManifest,
  type EnsikManifestItem,
} from '../lib/ensik-gemini';
import {
  WORD_CARD_IMAGE_HEIGHT,
  WORD_CARD_IMAGE_WIDTH,
} from '../lib/word-image-url';
import { mixWordsByLetter } from '../lib/word-order';
import { GROUP_SIZE } from '../lib/subgroups';

const prisma = new PrismaClient().$extends(withAccelerate());
const GRID_MODEL = 'gemini-grid';
const DEFAULT_COLS = 5;
const DEFAULT_ROWS = 4;

type GroupWord = {
  id: number;
  english: string;
  turkish: string;
};

type GroupJsonWord = GroupWord & { en?: string; tr?: string };

type GroupJson = {
  group: number;
  words: GroupJsonWord[];
};

function normalizeGroupWord(w: GroupJsonWord): GroupWord {
  return {
    id: w.id,
    english: w.english ?? w.en ?? '',
    turkish: w.turkish ?? w.tr ?? '',
  };
}

function argValue(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function groupJsonPath(group: number): string {
  return path.join(
    process.cwd(),
    'imageCollector',
    'out',
    `ensik-grup-${group}.json`
  );
}

function loadWordsFromJson(group: number): GroupWord[] {
  const p = groupJsonPath(group);
  if (!fs.existsSync(p)) {
    throw new Error(
      `Grup JSON yok: ${p}\nÖnce: npm run export-ensik-group -- --group=${group}`
    );
  }
  const data = JSON.parse(fs.readFileSync(p, 'utf8')) as GroupJson;
  return data.words.map(normalizeGroupWord);
}

function loadWordsFromIdRange(fromId: number, toId: number): GroupWord[] {
  const p = path.join(process.cwd(), 'imageCollector', 'out', 'ensik-kelimeler.json');
  if (!fs.existsSync(p)) {
    throw new Error(`Kelime listesi yok: ${p}\nÖnce: npm run export-ensik-words`);
  }
  const all = JSON.parse(fs.readFileSync(p, 'utf8')) as Array<{
    id: number;
    en: string;
    tr: string;
  }>;
  const words = all
    .filter((w) => w.id >= fromId && w.id <= toId)
    .map((w) => ({ id: w.id, english: w.en, turkish: w.tr }));
  if (words.length === 0) {
    throw new Error(`#${fromId}–#${toId} aralığında kelime bulunamadı`);
  }
  return words;
}

async function loadWordsFromDb(group: number): Promise<GroupWord[]> {
  const mod = await prisma.module.findUnique({
    where: { slug: MODULE_SLUG },
    select: { id: true },
  });
  if (!mod) throw new Error(`Modül yok: ${MODULE_SLUG}`);

  const all = await prisma.word.findMany({
    where: { moduleId: mod.id },
    select: { id: true, english: true, turkish: true },
    orderBy: { id: 'asc' },
  });
  const mixed = mixWordsByLetter(all);
  const start = (group - 1) * GROUP_SIZE;
  return mixed.slice(start, start + GROUP_SIZE);
}

function upsertManifest(
  manifest: ReturnType<typeof loadEnsikGeminiManifest>,
  item: EnsikManifestItem
) {
  const i = manifest.items.findIndex((x) => x.id === item.id);
  if (i >= 0) manifest.items[i] = item;
  else manifest.items.push(item);
}

type RowBand = { top: number; bottom: number; h: number };

/**
 * Satırlar arasındaki siyah şeritleri tespit eder; sadece ikon satırlarını döner.
 * Şerit yoksa boş dizi → eşit bölmeye düşülür.
 */
async function detectContentRows(
  inputPath: string,
  expectedRows: number
): Promise<RowBand[]> {
  const img = sharp(inputPath);
  const meta = await img.metadata();
  const width = meta.width;
  const height = meta.height;
  if (!width || !height) return [];

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const rowAvg = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * ch;
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    rowAvg[y] = sum / width;
  }

  const smooth = rowAvg.slice();
  for (let y = 1; y < height - 1; y++) {
    smooth[y] = (rowAvg[y - 1] + rowAvg[y] + rowAvg[y + 1]) / 3;
  }

  const sorted = [...smooth].sort((a, b) => a - b);
  const median = sorted[Math.floor(height / 2)];
  const thresh = Math.min(55, median * 0.35);

  const dark = smooth.map((v) => v < thresh);
  const bands: Array<[number, number]> = [];
  let s: number | null = null;
  for (let y = 0; y <= height; y++) {
    const isDark = y < height && dark[y];
    if (isDark && s === null) s = y;
    if (!isDark && s !== null) {
      if (y - s >= 8) bands.push([s, y - 1]);
      s = null;
    }
  }
  if (bands.length === 0) return [];

  const content: RowBand[] = [];
  let cursor = 0;
  for (const [bs, be] of bands) {
    if (bs > cursor) {
      content.push({ top: cursor, bottom: bs - 1, h: bs - cursor });
    }
    cursor = be + 1;
  }
  if (cursor < height) {
    content.push({ top: cursor, bottom: height - 1, h: height - cursor });
  }

  const kept = [...content]
    .sort((a, b) => b.h - a.h)
    .slice(0, expectedRows)
    .sort((a, b) => a.top - b.top);

  return kept.length === expectedRows ? kept : [];
}

function cellBounds(
  imgW: number,
  imgH: number,
  col: number,
  row: number,
  cols: number,
  rows: number,
  trim: number,
  rowBands?: RowBand[]
) {
  const left = Math.round((col * imgW) / cols) + trim;
  const right = Math.round(((col + 1) * imgW) / cols) - trim;
  let top: number;
  let bottom: number;
  if (rowBands && rowBands[row]) {
    top = rowBands[row].top + trim;
    bottom = rowBands[row].bottom - trim;
  } else {
    top = Math.round((row * imgH) / rows) + trim;
    bottom = Math.round(((row + 1) * imgH) / rows) - trim;
  }
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

async function main() {
  const input = argValue('input');
  if (!input) {
    throw new Error('--input=... gerekli (grid görsel yolu)');
  }

  const inputPath = path.isAbsolute(input)
    ? input
    : path.join(process.cwd(), input);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Görsel bulunamadı: ${inputPath}`);
  }

  const group = argValue('group')
    ? Math.max(1, parseInt(argValue('group')!, 10) || 1)
    : undefined;
  const fromId = argValue('from-id')
    ? parseInt(argValue('from-id')!, 10)
    : undefined;
  const toId = argValue('to-id')
    ? parseInt(argValue('to-id')!, 10)
    : undefined;
  const wordsFile = argValue('words');
  const cols = Math.max(1, parseInt(argValue('cols') || String(DEFAULT_COLS), 10));
  const rows = Math.max(1, parseInt(argValue('rows') || String(DEFAULT_ROWS), 10));
  const trim = Math.max(0, parseInt(argValue('trim') || '2', 10) || 0);
  const cellOffset = Math.max(
    0,
    parseInt(argValue('cell-offset') || '0', 10) || 0
  );
  const format = (argValue('format') || 'jpg').toLowerCase();
  const dryRun = hasFlag('dry-run');
  const preview = hasFlag('preview');

  if (!['jpg', 'jpeg', 'png', 'webp'].includes(format)) {
    throw new Error('--format jpg|png|webp olmalı');
  }

  let words: GroupWord[];
  if (fromId != null && toId != null) {
    words = loadWordsFromIdRange(fromId, toId);
  } else if (wordsFile) {
    const p = path.isAbsolute(wordsFile)
      ? wordsFile
      : path.join(process.cwd(), wordsFile);
    words = (JSON.parse(fs.readFileSync(p, 'utf8')) as GroupJson).words.map(
      normalizeGroupWord
    );
  } else if (group != null) {
    const jsonPath = groupJsonPath(group);
    words = fs.existsSync(jsonPath)
      ? loadWordsFromJson(group)
      : await loadWordsFromDb(group);
  } else {
    throw new Error('--group=N, --from-id/--to-id veya --words=... gerekli');
  }

  const gridCells = cols * rows;
  if (words.length + cellOffset > gridCells) {
    throw new Error(
      `Kelime sayısı ${words.length} + offset ${cellOffset}, grid ${cols}×${rows}=${gridCells} hücreden fazla`
    );
  }
  if (words.length + cellOffset < gridCells) {
    console.log(
      `Not: ${words.length} kelime, offset=${cellOffset}, grid ${gridCells} hücre`
    );
  }

  const meta = await sharp(inputPath).metadata();
  const imgW = meta.width;
  const imgH = meta.height;
  if (!imgW || !imgH) throw new Error('Görsel boyutu okunamadı');

  const outDir = ENSIK_GEMINI_OUT_DIR;
  const previewDir = path.join(
    process.cwd(),
    'imageCollector',
    'out',
    'grid-preview',
    group != null
      ? `grup-${group}`
      : fromId != null && toId != null
        ? `${fromId}-${toId}`
        : 'custom'
  );

  console.log(
    `Grid: ${path.basename(inputPath)} (${imgW}×${imgH}) → ${cols}×${rows}`
  );
  console.log(
    `Grup: ${group ?? 'custom'} | kelime: ${words.length} | trim=${trim} | cell-offset=${cellOffset}`
  );

  const skipBars = !hasFlag('no-skip-bars');
  const rowBands = skipBars
    ? await detectContentRows(inputPath, rows)
    : [];
  if (rowBands.length > 0) {
    console.log(
      `Siyah şerit atlandı → satırlar: ${rowBands
        .map((b, i) => `R${i + 1}=${b.top}-${b.bottom}`)
        .join(', ')}`
    );
  } else {
    console.log('Eşit satır bölmesi (şerit yok veya --no-skip-bars)');
  }
  if (dryRun) console.log('DRY-RUN — dosya yazılmayacak');

  if (!dryRun) {
    fs.mkdirSync(outDir, { recursive: true });
    if (preview) fs.mkdirSync(previewDir, { recursive: true });

    const archiveDir = path.join(
      process.cwd(),
      'imageCollector',
      'in',
      'grids'
    );
    fs.mkdirSync(archiveDir, { recursive: true });
    if (group != null) {
      const ext = path.extname(inputPath) || '.jpg';
      fs.copyFileSync(
        inputPath,
        path.join(archiveDir, `grup-${group}${ext}`)
      );
    }
  }

  const manifest = loadEnsikGeminiManifest();
  manifest.module_slug = MODULE_SLUG;
  const ext = format === 'jpeg' ? 'jpg' : format;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const cellIndex = i + cellOffset;
    const row = Math.floor(cellIndex / cols);
    const col = cellIndex % cols;
    const bounds = cellBounds(
      imgW,
      imgH,
      col,
      row,
      cols,
      rows,
      trim,
      rowBands.length > 0 ? rowBands : undefined
    );
    const fileName = `${word.id}.${ext}`;
    const outPath = path.join(outDir, fileName);

    console.log(
      `[${i + 1}/${words.length}] #${word.id} ${word.english} → (${col},${row}) ${fileName}`
    );

    if (dryRun) continue;

    let pipeline = sharp(inputPath)
      .extract(bounds)
      .resize(WORD_CARD_IMAGE_WIDTH, WORD_CARD_IMAGE_HEIGHT, {
        fit: 'cover',
        position: 'centre',
      });
    if (ext === 'jpg') {
      pipeline = pipeline.jpeg({ quality: 92, mozjpeg: true });
    } else if (ext === 'png') {
      pipeline = pipeline.png({ compressionLevel: 8 });
    } else {
      pipeline = pipeline.webp({ quality: 90 });
    }

    await pipeline.toFile(outPath);

    if (preview) {
      const previewName = `${String(i + 1).padStart(2, '0')}-${safeFileName(word.english)}.${ext}`;
      await sharp(outPath).resize(256, 256, { fit: 'inside' }).toFile(
        path.join(previewDir, previewName)
      );
    }

    upsertManifest(manifest, {
      id: word.id,
      english: word.english,
      turkish: word.turkish,
      status: 'ok',
      file: fileName,
      model: GRID_MODEL,
      prompt: buildEnsikGeminiPrompt(word.english, word.turkish),
    });
  }

  if (!dryRun) {
    saveEnsikGeminiManifest(manifest);
    console.log(`\nKaydedildi: public/ensik-gemini/ (${words.length} dosya)`);
    console.log(`Manifest güncellendi. DB için: npm run apply-ensik-images`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
