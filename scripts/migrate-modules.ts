/**
 * Modülleri oluşturur, mevcut kelimeleri Genel'e bağlar,
 * dataOne/Two/Three JSON'larını En Sık Çıkan'a import eder.
 *
 * npm run migrate-modules
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient().$extends(withAccelerate());

type JsonEntry = { id: number; word: string; turkish: string };
type JsonFile = { title?: string; entries: JsonEntry[] };

async function ensureModules() {
  const genel = await prisma.module.upsert({
    where: { slug: 'genel' },
    update: {
      name: 'Genel Kelimeler',
      description: 'Mevcut kelime bankası',
      sortOrder: 0,
    },
    create: {
      slug: 'genel',
      name: 'Genel Kelimeler',
      description: 'Mevcut kelime bankası',
      sortOrder: 0,
    },
  });

  const sik = await prisma.module.upsert({
    where: { slug: 'en-sik-cikan' },
    update: {
      name: 'En Sık Çıkan Kelimeler',
      description: 'YDS’de sık çıkan kelimeler',
      sortOrder: 1,
    },
    create: {
      slug: 'en-sik-cikan',
      name: 'En Sık Çıkan Kelimeler',
      description: 'YDS’de sık çıkan kelimeler',
      sortOrder: 1,
    },
  });

  return { genel, sik };
}

async function assignExistingToGenel(genelId: number) {
  const orphans = await prisma.word.findMany({
    where: { moduleId: null },
    orderBy: { id: 'asc' },
  });
  console.log('Modülsüz kelime:', orphans.length);

  const seen = new Map<string, number>(); // englishLower -> keeperId

  for (const word of orphans) {
    const key = word.english.trim().toLowerCase();
    const keeperId = seen.get(key);

    if (!keeperId) {
      await prisma.word.update({
        where: { id: word.id },
        data: { moduleId: genelId },
      });
      seen.set(key, word.id);
      continue;
    }

    // Yinelenen: ilişkileri keeper'a taşı, sonra sil
    await prisma.learnedWord.updateMany({
      where: { wordId: word.id },
      data: { wordId: keeperId },
    }).catch(async () => {
      // unique conflict → sil
      await prisma.learnedWord.deleteMany({ where: { wordId: word.id } });
    });
    await prisma.unlearnedWord.updateMany({
      where: { wordId: word.id },
      data: { wordId: keeperId },
    }).catch(async () => {
      await prisma.unlearnedWord.deleteMany({ where: { wordId: word.id } });
    });
    await prisma.word.delete({ where: { id: word.id } });
  }

  // Hâlâ null kalan var mı?
  const stillNull = await prisma.word.count({ where: { moduleId: null } });
  const count = await prisma.word.count({ where: { moduleId: genelId } });
  console.log('Kalan null:', stillNull, '| Genel Kelimeler:', count);
}

async function importFrequent(sikId: number) {
  const files = ['dataOne.json', 'dataTwo.json', 'dataThree.json'];
  const map = new Map<string, { english: string; turkish: string }>();

  for (const file of files) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) {
      console.warn('Dosya yok:', file);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(full, 'utf8')) as JsonFile;
    for (const entry of data.entries || []) {
      const english = entry.word.trim();
      const key = english.toLowerCase();
      if (!key || map.has(key)) continue;
      map.set(key, { english, turkish: entry.turkish.trim() });
    }
    console.log(`${file}: ${data.entries?.length ?? 0} okundu`);
  }

  const entries = Array.from(map.values());
  let created = 0;
  const BATCH = 50;

  for (let i = 0; i < entries.length; i += BATCH) {
    const slice = entries.slice(i, i + BATCH);
    try {
      const res = await prisma.word.createMany({
        data: slice.map((w) => ({
          english: w.english,
          turkish: w.turkish,
          moduleId: sikId,
          addedBy: 'import-json',
        })),
        skipDuplicates: true,
      });
      created += res.count;
    } catch {
      for (const w of slice) {
        try {
          await prisma.word.upsert({
            where: {
              moduleId_english: { moduleId: sikId, english: w.english },
            },
            update: { turkish: w.turkish },
            create: {
              english: w.english,
              turkish: w.turkish,
              moduleId: sikId,
              addedBy: 'import-json',
            },
          });
          created += 1;
        } catch {
          /* skip */
        }
      }
    }
    if (i % 200 === 0) console.log(`Import: ${i}/${entries.length}`);
  }

  const total = await prisma.word.count({ where: { moduleId: sikId } });
  console.log(`En Sık: create≈${created}, DB toplam=${total}`);
}

async function main() {
  console.log('Modül migrasyonu başlıyor...');
  const { genel, sik } = await ensureModules();
  console.log('Modüller:', genel.id, genel.slug, '|', sik.id, sik.slug);
  await assignExistingToGenel(genel.id);
  await importFrequent(sik.id);

  const summary = await prisma.module.findMany({
    include: { _count: { select: { words: true } } },
    orderBy: { sortOrder: 'asc' },
  });
  for (const m of summary) {
    console.log(`  - ${m.name}: ${m._count.words} kelime`);
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
