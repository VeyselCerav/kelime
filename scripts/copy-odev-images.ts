/**
 * Ödev kelimelerine diğer modüllerdeki aynı İngilizce kelimenin imageUrl’ini kopyalar.
 *
 * npm run copy-odev-images
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { ODEV_SLUG } from '../lib/odev';

const prisma = new PrismaClient().$extends(withAccelerate());

const PREFERRED_SLUGS = [
  'en-cok-cikan-verb',
  'en-sik-cikan',
  'seviye-seviye',
  'genel',
  'phrasal-verbs',
  'irregular-verbs',
];

function rankSlug(slug: string): number {
  const i = PREFERRED_SLUGS.indexOf(slug);
  return i === -1 ? 99 : i;
}

async function main() {
  const mod = await prisma.module.findUnique({ where: { slug: ODEV_SLUG } });
  if (!mod) throw new Error('odev modülü yok — önce npm run import-odev');

  const words = await prisma.word.findMany({
    where: { moduleId: mod.id },
    select: { id: true, english: true, imageUrl: true },
    orderBy: { id: 'asc' },
  });

  let updated = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const w of words) {
    const candidates = await prisma.word.findMany({
      where: {
        english: { equals: w.english, mode: 'insensitive' },
        moduleId: { not: mod.id },
        NOT: { imageUrl: null },
      },
      select: {
        imageUrl: true,
        imagePrompt: true,
        module: { select: { slug: true } },
      },
    });

    const withUrl = candidates.filter((c) => c.imageUrl && c.imageUrl.trim());
    if (withUrl.length === 0) {
      missing.push(w.english);
      continue;
    }

    withUrl.sort(
      (a, b) => rankSlug(a.module.slug) - rankSlug(b.module.slug)
    );
    const best = withUrl[0];
    if (w.imageUrl === best.imageUrl) {
      skipped += 1;
      continue;
    }

    await prisma.word.update({
      where: { id: w.id },
      data: {
        imageUrl: best.imageUrl,
        imagePrompt: best.imagePrompt ?? undefined,
      },
    });
    updated += 1;
    console.log(`${w.english} ← ${best.module.slug}`);
  }

  console.log(
    JSON.stringify(
      {
        total: words.length,
        updated,
        skippedSame: skipped,
        missingCount: missing.length,
        missing,
      },
      null,
      2
    )
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
