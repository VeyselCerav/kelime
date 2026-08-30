/**
 * Seviye Seviye — 10×10 grid için JSON export.
 * Uygulama sırası: seviye içinde mixWordsByLetter.
 *
 * PowerShell:
 *   npm run export-seviye-grids
 *   npm run export-seviye-grids -- --level=A1
 *   npm run export-seviye-grids -- --level=A1 --dry-run
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as fs from 'fs';
import * as path from 'path';
import { mixWordsByLetter } from '../lib/word-order';

const prisma = new PrismaClient().$extends(withAccelerate());

const MODULE_SLUG = 'seviye-seviye';
const GRID_COLS = 10;
const GRID_ROWS = 10;
const BATCH_SIZE = GRID_COLS * GRID_ROWS; // 100
const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

type Level = (typeof LEVELS)[number];

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

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env'));

  const dryRun = hasFlag('dry-run');
  const levelArg = argValue('level')?.trim().toUpperCase();
  const levels: Level[] = levelArg
    ? ([levelArg as Level].filter((l) =>
        (LEVELS as readonly string[]).includes(l)
      ) as Level[])
    : [...LEVELS];

  if (levelArg && levels.length === 0) {
    throw new Error(`--level geçersiz. Kullan: ${LEVELS.join(', ')}`);
  }

  const mod = await prisma.module.findUnique({
    where: { slug: MODULE_SLUG },
    select: { id: true, name: true, slug: true },
  });
  if (!mod) throw new Error(`Modül yok: ${MODULE_SLUG}`);

  const outDir = path.join(process.cwd(), 'imageCollector', 'out');
  fs.mkdirSync(outDir, { recursive: true });

  const rehberLines: string[] = [
    `# Seviye Seviye — 10×10 grid JSON (uygulama sırası: mixWordsByLetter)`,
    ``,
    `Modül: **${mod.name}** · Grid: **${GRID_COLS}×${GRID_ROWS}** (${BATCH_SIZE} kelime/batch)`,
    ``,
    `| Seviye | Batch | Dosya | Kelime | İlk ID | Son ID |`,
    `|--------|-------|-------|--------|--------|--------|`,
  ];

  let totalFiles = 0;
  let totalWords = 0;

  for (const level of levels) {
    const rows = await prisma.word.findMany({
      where: { moduleId: mod.id, category: level },
      select: { id: true, english: true, turkish: true, category: true },
      orderBy: { id: 'asc' },
    });

    const mixed = mixWordsByLetter(rows);
    const batches = chunkWords(mixed, BATCH_SIZE);

    console.log(
      `\n${level}: ${mixed.length} kelime → ${batches.length} batch (10×10)`
    );

    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];
      const batchNo = bi + 1;
      const fileName = `seviye-${level}-${String(batchNo).padStart(2, '0')}.json`;
      const words = batch.map((w, i) => ({
        pos: i + 1,
        id: w.id,
        en: w.english,
        tr: w.turkish,
      }));

      const payload = {
        module: MODULE_SLUG,
        module_name: mod.name,
        level,
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
          level_total: mixed.length,
        },
        words,
        gemini_hint:
          '10×10 grid, her hücrede bir kelime görseli. Sıra: soldan sağa, yukarıdan aşağı. Hücre sırası = pos (1…N). Dosya adı kelime id ile eşleşecek: {id}.jpg',
      };

      rehberLines.push(
        `| ${level} | ${batchNo}/${batches.length} | \`${fileName}\` | ${words.length} | ${words[0]?.id ?? '-'} | ${words[words.length - 1]?.id ?? '-'} |`
      );

      if (dryRun) {
        console.log(
          `  dry ${fileName}: ${words.length} kelime · #${words[0]?.id} ${words[0]?.en} → #${words[words.length - 1]?.id} ${words[words.length - 1]?.en}`
        );
      } else {
        const outPath = path.join(outDir, fileName);
        fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
        console.log(
          `  ${fileName}: ${words.length} · #${words[0]?.id} ${words[0]?.en} → #${words[words.length - 1]?.id} ${words[words.length - 1]?.en}`
        );
      }

      totalFiles++;
      totalWords += words.length;
    }
  }

  rehberLines.push(``);
  rehberLines.push(`Toplam: **${totalWords}** kelime · **${totalFiles}** JSON`);
  rehberLines.push(``);
  rehberLines.push(`## Kırpma notu`);
  rehberLines.push(``);
  rehberLines.push(
    `Grid hücresi → \`public/...\` dosya adı **kelime id** olmalı (örn. \`3535.jpg\`).`
  );
  rehberLines.push(
    `Son batch’lerde 100’den az kelime varsa boş hücreler yok sayılır (soldan sağa ilk N hücre).`
  );

  if (!dryRun) {
    const rehberPath = path.join(outDir, 'seviye-gruplar-rehber.md');
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
