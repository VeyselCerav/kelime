/**
 * Kelimeleri JSON’a aktar (Prisma Accelerate ile).
 * imageCollector/collect_images.py --from-json ile kullanılır.
 *
 * zsh:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/export-image-words.ts --limit=50
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/export-image-words.ts --out=imageCollector/words.json --force
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/export-image-words.ts --module=seviye-seviye --category=A1
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient().$extends(withAccelerate());

function argValue(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const limit = argValue('limit') ? parseInt(argValue('limit')!, 10) : undefined;
  const offset = parseInt(argValue('offset') || '0', 10) || 0;
  const moduleSlug = argValue('module');
  const category = argValue('category');
  const force = hasFlag('force'); // imageUrl dolu olanları da al
  const onlyMissing = hasFlag('only-missing') || !force;
  const out =
    argValue('out') ||
    path.join(process.cwd(), 'imageCollector', 'words.json');

  let moduleId: number | undefined;
  if (moduleSlug) {
    const mod = await prisma.module.findUnique({ where: { slug: moduleSlug } });
    if (!mod) throw new Error(`Modül yok: ${moduleSlug}`);
    moduleId = mod.id;
  }

  const words = await prisma.word.findMany({
    where: {
      ...(moduleId ? { moduleId } : {}),
      ...(category ? { category } : {}),
      ...(onlyMissing && !force ? { imageUrl: null } : {}),
    },
    select: {
      id: true,
      english: true,
      turkish: true,
      moduleId: true,
      category: true,
      imageUrl: true,
    },
    orderBy: { id: 'asc' },
    ...(limit != null ? { take: limit, skip: offset } : offset ? { skip: offset } : {}),
  });

  const payload = {
    exported_at: new Date().toISOString(),
    count: words.length,
    words: words.map((w) => ({
      id: w.id,
      english: w.english,
      turkish: w.turkish,
      module_id: w.moduleId,
      category: w.category,
      image_url: w.imageUrl,
    })),
  };

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Export: ${words.length} kelime → ${out}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
