/**
 * Kalan modüller — 10×10 grid için 100’lük JSON export.
 * Sıra: kategori varsa kategori sırası + mixWordsByLetter; yoksa tüm modül mixWordsByLetter.
 *
 * PowerShell:
 *   npm run export-module-grids
 *   npm run export-module-grids -- --module=genel
 *   npm run export-module-grids -- --dry-run
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as fs from 'fs';
import * as path from 'path';
import { mixWordsByLetter } from '../lib/word-order';

const prisma = new PrismaClient().$extends(withAccelerate());

const GRID_COLS = 10;
const GRID_ROWS = 10;
const BATCH_SIZE = GRID_COLS * GRID_ROWS; // 100

/** Görsel bekleyen modüller (kısa dosya öneki) */
const MODULES: Array<{ slug: string; filePrefix: string }> = [
  { slug: 'genel', filePrefix: 'genel' },
  { slug: 'en-cok-cikan-verb', filePrefix: 'verb' },
  { slug: 'en-sik-cikan-sifatlar', filePrefix: 'sifatlar' },
  { slug: 'en-sik-cikan-adverbs', filePrefix: 'adverbs' },
  { slug: 'tense-anahtar', filePrefix: 'tense' },
];

type WordRow = {
  id: number;
  english: string;
  turkish: string;
  category: string | null;
};

function argValue(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function chunkWords<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Uygulama ile aynı: tümü kategoriliyse kategori sırası + her grupta mixWordsByLetter */
function orderWordsLikeApp(words: WordRow[]): WordRow[] {
  const categorized = words.filter((w) => w.category && w.category.trim());
  if (words.length > 0 && categorized.length === words.length) {
    const order: string[] = [];
    const seen = new Set<string>();
    for (const w of words) {
      const cat = w.category!.trim();
      if (!seen.has(cat)) {
        seen.add(cat);
        order.push(cat);
      }
    }
    const ordered: WordRow[] = [];
    for (const cat of order) {
      ordered.push(
        ...mixWordsByLetter(words.filter((w) => w.category === cat))
      );
    }
    return ordered;
  }
  return mixWordsByLetter(words);
}

async function exportModule(
  slug: string,
  filePrefix: string,
  outDir: string,
  dryRun: boolean,
  rehberLines: string[]
): Promise<{ files: number; words: number }> {
  const mod = await prisma.module.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!mod) throw new Error(`Modül yok: ${slug}`);

  const rows = await prisma.word.findMany({
    where: { moduleId: mod.id },
    select: { id: true, english: true, turkish: true, category: true },
    orderBy: { id: 'asc' },
  });

  const mixed = orderWordsLikeApp(rows);
  const batches = chunkWords(mixed, BATCH_SIZE);

  console.log(
    `\n${mod.name} (${slug}): ${mixed.length} kelime → ${batches.length} batch`
  );

  let files = 0;
  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    const batchNo = bi + 1;
    const fileName = `${filePrefix}-${String(batchNo).padStart(2, '0')}.json`;
    const words = batch.map((w, i) => ({
      pos: i + 1,
      id: w.id,
      en: w.english,
      tr: w.turkish,
      ...(w.category ? { category: w.category } : {}),
    }));

    const payload = {
      module: mod.slug,
      module_name: mod.name,
      file_prefix: filePrefix,
      batch: batchNo,
      batch_count: batches.length,
      group_size: BATCH_SIZE,
      count: words.length,
      order: 'mixWordsByLetter (uygulama ile aynı)',
      grid: {
        cols: GRID_COLS,
        rows: GRID_ROWS,
        reading: 'left-to-right, top-to-bottom',
      },
      range: {
        start: (batchNo - 1) * BATCH_SIZE + 1,
        end: (batchNo - 1) * BATCH_SIZE + words.length,
        module_total: mixed.length,
      },
      words,
      gemini_hint:
        '10×10 grid, her hücrede bir kelime görseli. Sıra: soldan sağa, yukarıdan aşağı. pos = hücre sırası. Dosya adı: {id}.jpg',
    };

    rehberLines.push(
      `| ${mod.name} | ${batchNo}/${batches.length} | \`${fileName}\` | ${words.length} | ${words[0]?.id ?? '-'} | ${words[words.length - 1]?.id ?? '-'} |`
    );

    if (dryRun) {
      console.log(
        `  dry ${fileName}: ${words.length} · #${words[0]?.id} ${words[0]?.en} → #${words[words.length - 1]?.id} ${words[words.length - 1]?.en}`
      );
    } else {
      const outPath = path.join(outDir, fileName);
      fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
      console.log(
        `  ${fileName}: ${words.length} · #${words[0]?.id} ${words[0]?.en} → #${words[words.length - 1]?.id} ${words[words.length - 1]?.en}`
      );
    }
    files++;
  }

  return { files, words: mixed.length };
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env'));

  const dryRun = hasFlag('dry-run');
  const moduleArg = argValue('module')?.trim();
  const selected = moduleArg
    ? MODULES.filter((m) => m.slug === moduleArg || m.filePrefix === moduleArg)
    : MODULES;

  if (moduleArg && selected.length === 0) {
    throw new Error(
      `--module geçersiz. Kullan: ${MODULES.map((m) => m.slug).join(', ')}`
    );
  }

  const outDir = path.join(process.cwd(), 'imageCollector', 'out');
  fs.mkdirSync(outDir, { recursive: true });

  const rehberLines: string[] = [
    `# Kalan modüller — 10×10 grid JSON (mixWordsByLetter)`,
    ``,
    `Grid: **${GRID_COLS}×${GRID_ROWS}** (${BATCH_SIZE} kelime/batch)`,
    ``,
    `| Modül | Batch | Dosya | Kelime | İlk ID | Son ID |`,
    `|-------|-------|-------|--------|--------|--------|`,
  ];

  let totalFiles = 0;
  let totalWords = 0;

  for (const m of selected) {
    const r = await exportModule(
      m.slug,
      m.filePrefix,
      outDir,
      dryRun,
      rehberLines
    );
    totalFiles += r.files;
    totalWords += r.words;
  }

  rehberLines.push(``);
  rehberLines.push(`Toplam: **${totalWords}** kelime · **${totalFiles}** JSON`);
  rehberLines.push(``);
  rehberLines.push(`## Dosya adları`);
  rehberLines.push(``);
  for (const m of selected) {
    rehberLines.push(`- \`${m.filePrefix}-NN.json\` ← \`${m.slug}\``);
  }
  rehberLines.push(``);
  rehberLines.push(
    `Grid hücresi → kırpınca dosya adı **kelime id** olmalı (\`{id}.jpg\`).`
  );

  if (!dryRun) {
    const rehberPath = path.join(outDir, 'modul-gruplar-rehber.md');
    fs.writeFileSync(rehberPath, rehberLines.join('\n') + '\n', 'utf8');
    console.log(`\nRehber: ${rehberPath}`);
  }

  console.log(
    `\nBitti. files=${totalFiles} words=${totalWords}${dryRun ? ' (dry-run)' : ''}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
