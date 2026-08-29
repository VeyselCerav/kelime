/**
 * Kelime görsellerini Cloudflare R2'ye yükle + DB imageUrl güncelle.
 *
 * zsh:
 *   npm run upload-word-images-r2
 *   npm run upload-word-images-r2 -- --source=ensik-gemini
 *   npm run upload-word-images-r2 -- --concurrency=16 --force
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import {
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { ENSIK_GEMINI_PUBLIC_DIR, PROMPT_TAG, GEMINI_GRID_PROMPT_TAG, COMFY_PROMPT_TAG } from '../lib/ensik-gemini';

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

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(
      `${name} eksik. Cloudflare R2 bilgilerini .env.local’e ekleyin.`
    );
  }
  return v;
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

function publicUrl(base: string, key: string): string {
  return `${base.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env'));

  const accountId = requireEnv('R2_ACCOUNT_ID');
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
  const bucket = process.env.R2_BUCKET?.trim() || 'yds-monster-word-images';
  const publicBase = requireEnv('R2_PUBLIC_BASE_URL');

  const dryRun = hasFlag('dry-run');
  const force = hasFlag('force');
  const limit = argValue('limit')
    ? parseInt(argValue('limit')!, 10)
    : undefined;
  const concurrency = Math.max(
    1,
    parseInt(argValue('concurrency') || '16', 10) || 16
  );

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  // Bucket yoksa oluşturmayı dene
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    if (!dryRun) {
      console.log(`Bucket yok, oluşturuluyor: ${bucket}`);
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  }

  const source = argValue('source')?.trim() || 'word-images';
  const isEnsik = source === 'ensik-gemini';
  const localSubdir = isEnsik ? ENSIK_GEMINI_PUBLIC_DIR : 'word-images';
  const r2Prefix = isEnsik ? ENSIK_GEMINI_PUBLIC_DIR : 'word-images';

  const dir = path.join(process.cwd(), 'public', localSubdir);
  if (!fs.existsSync(dir)) {
    throw new Error(`Klasör yok: public/${localSubdir}`);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d+\.jpe?g$/i.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const already = new Set<number>();
  if (!force) {
    const cdnNeedle = publicBase.replace(/^https?:\/\//, '');
    const rows = await prisma.word.findMany({
      where: isEnsik
        ? {
            AND: [
              {
                OR: [
                  { imagePrompt: { startsWith: PROMPT_TAG } },
                  { imagePrompt: { startsWith: GEMINI_GRID_PROMPT_TAG } },
                  { imagePrompt: { startsWith: COMFY_PROMPT_TAG } },
                ],
              },
              {
                OR: [
                  { imageUrl: { contains: 'r2.dev' } },
                  { imageUrl: { contains: cdnNeedle } },
                ],
              },
            ],
          }
        : {
            OR: [
              { imageUrl: { contains: 'r2.dev' } },
              { imageUrl: { contains: cdnNeedle } },
            ],
            NOT: {
              OR: [
                { imagePrompt: { startsWith: PROMPT_TAG } },
                { imagePrompt: { startsWith: GEMINI_GRID_PROMPT_TAG } },
                { imagePrompt: { startsWith: COMFY_PROMPT_TAG } },
              ],
            },
          },
      select: { id: true },
    });
    for (const r of rows) already.add(r.id);
    console.log(`Zaten R2 URL (${source}): ${already.size}`);
  }

  let selected = files.filter((f) => force || !already.has(parseInt(f, 10)));
  if (limit != null) selected = selected.slice(0, limit);

  console.log(
    `${selected.length} dosya → R2/${bucket}/${r2Prefix} (source=${source}, concurrency=${concurrency}${
      dryRun ? ', dry-run' : ''
    })`
  );

  let uploaded = 0;
  let updated = 0;
  let failed = 0;
  const t0 = Date.now();

  await mapPool(selected, concurrency, async (fname, idx) => {
    const id = parseInt(fname, 10);
    const key = `${r2Prefix}/${fname}`;
    const localPath = path.join(dir, fname);
    const url = publicUrl(publicBase, key);

    try {
      if (dryRun) {
        uploaded++;
        return;
      }

      const body = fs.readFileSync(localPath);
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: 'image/jpeg',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      await prisma.word.update({
        where: { id },
        data: { imageUrl: url },
      });

      uploaded++;
      updated++;
      if ((idx + 1) % 100 === 0 || idx === 0) {
        const elapsed = (Date.now() - t0) / 1000;
        const rate = uploaded / Math.max(elapsed, 1);
        const eta = Math.round(
          (selected.length - uploaded) / Math.max(rate, 0.01)
        );
        console.log(
          `[${idx + 1}/${selected.length}] #${id} ${rate.toFixed(1)}/s eta~${eta}s fail=${failed}`
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
  console.log(`Örnek URL: ${publicUrl(publicBase, `${r2Prefix}/25.jpg`)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
