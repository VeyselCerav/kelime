/**
 * public/word-images/{id}.jpg → Vercel Blob (public CDN) + DB imageUrl güncelle.
 *
 * zsh:
 *   npm run upload-word-images-blob
 *   npm run upload-word-images-blob -- --limit=20 --dry-run
 *   npm run upload-word-images-blob -- --concurrency=16 --force
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { put } from '@vercel/blob';
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

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env'));

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN yok (.env.local / Vercel env)');
  }

  const dryRun = hasFlag('dry-run');
  const force = hasFlag('force');
  const limit = argValue('limit')
    ? parseInt(argValue('limit')!, 10)
    : undefined;
  const concurrency = Math.max(
    1,
    parseInt(argValue('concurrency') || '16', 10) || 16
  );
  const dir = path.join(process.cwd(), 'public', 'word-images');

  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d+\.jpe?g$/i.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  // Tek seferde hangi id'lerin blob URL'si var?
  const alreadyBlob = new Set<number>();
  if (!force) {
    const rows = await prisma.word.findMany({
      where: { imageUrl: { contains: 'blob.vercel-storage.com' } },
      select: { id: true },
    });
    for (const r of rows) alreadyBlob.add(r.id);
    console.log(`Zaten blob’da: ${alreadyBlob.size}`);
  }

  let selected = files.filter((f) => force || !alreadyBlob.has(parseInt(f, 10)));
  if (limit != null) selected = selected.slice(0, limit);

  console.log(
    `${selected.length} dosya yüklenecek (concurrency=${concurrency}${
      dryRun ? ', dry-run' : ''
    })`
  );

  let uploaded = 0;
  let updated = 0;
  let failed = 0;
  const t0 = Date.now();

  await mapPool(selected, concurrency, async (fname, idx) => {
    const id = parseInt(fname, 10);
    const localPath = path.join(dir, fname);
    const pathname = `word-images/${fname}`;

    try {
      if (dryRun) {
        uploaded++;
        return;
      }

      const buf = fs.readFileSync(localPath);
      const blob = await put(pathname, buf, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'image/jpeg',
        token,
      });

      await prisma.word.update({
        where: { id },
        data: { imageUrl: blob.url },
      });

      uploaded++;
      updated++;
      if ((idx + 1) % 100 === 0 || idx === 0) {
        const elapsed = (Date.now() - t0) / 1000;
        const rate = uploaded / Math.max(elapsed, 1);
        const eta = Math.round((selected.length - uploaded) / Math.max(rate, 0.01));
        console.log(
          `[${idx + 1}/${selected.length}] #${id} rate=${rate.toFixed(1)}/s eta~${eta}s fail=${failed}`
        );
      }
    } catch (e) {
      failed++;
      console.error(`fail #${id}:`, e instanceof Error ? e.message : e);
    }
  });

  console.log(
    `Bitti. uploaded=${uploaded} db=${updated} fail=${failed} ${(
      (Date.now() - t0) /
      1000
    ).toFixed(0)}s`
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
