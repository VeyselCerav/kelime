/**
 * Seviye Seviye modülü — A1, A2, B1, B2 alt grupları.
 *
 * npm run import-level
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as fs from 'fs';
import * as path from 'path';
import { parseWordJson } from '../lib/module-import';

const prisma = new PrismaClient().$extends(withAccelerate());

const SLUG = 'seviye-seviye';
const NAME = 'Seviye Seviye';
const DESCRIPTION = 'CEFR seviyelerine göre kelimeler (A1–B2)';

async function main() {
  const filePath = path.join(process.cwd(), 'level.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dosya yok: ${filePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const words = parseWordJson(raw);
  console.log(
    `Parse: ${words.length} kelime, ${new Set(words.map((w) => w.category)).size} seviye`
  );

  const maxSort = await prisma.module.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxSort._max.sortOrder ?? 1) + 1;

  const module = await prisma.module.upsert({
    where: { slug: SLUG },
    update: {
      name: NAME,
      description: DESCRIPTION,
    },
    create: {
      slug: SLUG,
      name: NAME,
      description: DESCRIPTION,
      sortOrder,
    },
  });

  console.log(`Modül: ${module.name} (id=${module.id})`);

  const existing = await prisma.word.findMany({
    where: { moduleId: module.id },
    select: { english: true },
  });
  const existingSet = new Set(existing.map((w) => w.english.toLowerCase()));

  const toCreate = words
    .filter((w) => !existingSet.has(w.english.toLowerCase()))
    .map((w) => ({
      english: w.english,
      turkish: w.turkish,
      category: w.category ?? null,
      moduleId: module.id,
      addedBy: 'import-level',
    }));

  let updated = 0;
  for (const w of words) {
    if (!existingSet.has(w.english.toLowerCase())) continue;
    if (!w.category) continue;
    const result = await prisma.word.updateMany({
      where: {
        moduleId: module.id,
        english: w.english,
        OR: [{ category: null }, { category: { not: w.category } }],
      },
      data: { category: w.category },
    });
    updated += result.count;
  }

  let created = 0;
  const BATCH = 100;
  for (let i = 0; i < toCreate.length; i += BATCH) {
    const chunk = toCreate.slice(i, i + BATCH);
    const result = await prisma.word.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    created += result.count;
  }

  const total = await prisma.word.count({ where: { moduleId: module.id } });
  const cats = await prisma.word.groupBy({
    by: ['category'],
    where: { moduleId: module.id },
    _count: true,
  });

  console.log(`Oluşturulan: ${created}, category güncellenen: ${updated}, toplam: ${total}`);
  console.log(
    'Seviye dağılımı:',
    cats
      .filter((c) => c.category)
      .sort((a, b) => (a.category ?? '').localeCompare(b.category ?? ''))
      .map((c) => `${c.category}: ${c._count}`)
      .join(' | ')
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
