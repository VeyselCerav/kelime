/**
 * imageCollector/out/manifest.json + jpg → public/word-images + DB (Prisma Accelerate).
 *
 * zsh:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/apply-word-images.ts
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/apply-word-images.ts --dry-run
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/apply-word-images.ts --force
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

type ManifestItem = {
  id: number;
  english?: string;
  file?: string | null;
  status?: string;
  source?: string;
  license?: string;
  attribution?: string;
  source_url?: string;
};

async function main() {
  const dryRun = hasFlag('dry-run');
  const force = hasFlag('force');
  const statusFilter = (argValue('status') || 'ok')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const manifestPath = path.resolve(
    argValue('manifest') ||
      path.join(process.cwd(), 'imageCollector', 'out', 'manifest.json')
  );
  const outDir = path.resolve(
    argValue('out') || path.join(process.cwd(), 'imageCollector', 'out')
  );
  const publicDir = path.join(process.cwd(), 'public', 'word-images');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest yok: ${manifestPath}`);
  }

  const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const items: ManifestItem[] = Array.isArray(data.items) ? data.items : [];
  const candidates = items.filter((it) => statusFilter.includes(it.status || ''));

  fs.mkdirSync(publicDir, { recursive: true });

  let copied = 0;
  let updated = 0;
  let skipped = 0;

  for (const it of candidates) {
    const fname = it.file || `${it.id}.jpg`;
    const src = path.join(outDir, fname);
    if (!fs.existsSync(src)) {
      console.warn(`skip #${it.id}: dosya yok (${fname})`);
      skipped++;
      continue;
    }

    const imageUrl = `/word-images/${fname}`;
    const note = [it.source, it.license, it.attribution, it.source_url]
      .filter(Boolean)
      .join(' | ')
      .slice(0, 500);

    if (dryRun) {
      console.log(`dry #${it.id} ${it.english || ''} → ${imageUrl}`);
      continue;
    }

    fs.copyFileSync(src, path.join(publicDir, fname));
    copied++;

    if (force) {
      await prisma.word.update({
        where: { id: it.id },
        data: { imageUrl, imagePrompt: note || null },
      });
      updated++;
    } else {
      const res = await prisma.word.updateMany({
        where: { id: it.id, imageUrl: null },
        data: { imageUrl, imagePrompt: note || null },
      });
      updated += res.count;
      if (res.count === 0) skipped++;
    }
  }

  console.log(
    dryRun
      ? `Dry-run: ${candidates.length} aday`
      : `Bitti. kopyalanan=${copied} db_guncellenen=${updated} skip=${skipped}`
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
