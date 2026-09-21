/**
 * Ödev modülü — JSON olduğu gibi (332 satır), id sırası, Gün-1 = id 1–25 …
 *
 * npm run import-odev
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as fs from 'fs';
import * as path from 'path';
import { ODEV_NAME, ODEV_SLUG, odevDayLabel } from '../lib/odev';

const prisma = new PrismaClient().$extends(withAccelerate());

type Row = { id?: number; word?: string; meaning?: string };

async function main() {
  const filePath = path.join(
    process.cwd(),
    'EN_ONEMLI_VERB_332_KELIME_JSON.json'
  );
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dosya yok: ${filePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Row[];
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('JSON boş veya dizi değil');
  }

  const sorted = [...raw].sort(
    (a, b) => (Number(a.id) || 0) - (Number(b.id) || 0)
  );

  const words = sorted
    .map((r) => {
      const jsonId = Number(r.id) || 0;
      return {
        jsonId,
        english: String(r.word || '').trim(),
        turkish: String(r.meaning || '').trim(),
        category: jsonId > 0 ? odevDayLabel(jsonId) : '',
      };
    })
    .filter((w) => w.english && w.turkish && w.category);

  console.log(`Parse: ${words.length} kelime (JSON olduğu gibi)`);

  const maxSort = await prisma.module.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxSort._max.sortOrder ?? 1) + 1;

  const module = await prisma.module.upsert({
    where: { slug: ODEV_SLUG },
    update: {
      name: ODEV_NAME,
      description: 'Günlük 25 kelimelik ödev — sadece yetkili üyeler',
      isRestricted: true,
    },
    create: {
      slug: ODEV_SLUG,
      name: ODEV_NAME,
      description: 'Günlük 25 kelimelik ödev — sadece yetkili üyeler',
      sortOrder,
      isRestricted: true,
    },
  });

  console.log(
    `Modül: ${module.name} (id=${module.id}, restricted=${module.isRestricted})`
  );

  await prisma.word.deleteMany({ where: { moduleId: module.id } });

  let created = 0;
  for (const w of words) {
    await prisma.word.create({
      data: {
        english: w.english,
        turkish: w.turkish,
        category: w.category,
        moduleId: module.id,
        addedBy: 'import-odev',
      },
    });
    created += 1;
  }

  const dayCounts = await prisma.word.groupBy({
    by: ['category'],
    where: { moduleId: module.id },
    _count: { _all: true },
  });
  dayCounts.sort((a, b) =>
    String(a.category).localeCompare(String(b.category), 'tr', {
      numeric: true,
    })
  );

  console.log(`Oluşturulan: ${created}`);
  console.log(
    'Günler:',
    dayCounts.map((d) => `${d.category}=${d._count._all}`).join(', ')
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
