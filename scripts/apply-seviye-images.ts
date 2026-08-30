/**
 * seviye-gemini-manifest + public/seviye-gemini → DB (seviye-seviye).
 *
 * PowerShell:
 *   npm run apply-seviye-images
 *   npm run apply-seviye-images -- --dry-run
 *   npm run apply-seviye-images -- --force
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as fs from 'fs';
import * as path from 'path';
import {
  SEVIYE_GEMINI_MANIFEST_PATH,
  SEVIYE_GEMINI_OUT_DIR,
  SEVIYE_MODULE_SLUG,
  SEVIYE_GRID_PROMPT_TAG,
  buildSeviyeGeminiPrompt,
  loadSeviyeGeminiManifest,
  saveSeviyeGeminiManifest,
  seviyeGeminiImagePath,
  seviyeGeminiImageUrl,
  type SeviyeManifestItem,
} from '../lib/seviye-gemini';

const prisma = new PrismaClient().$extends(withAccelerate());

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

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function markApplied(
  manifest: ReturnType<typeof loadSeviyeGeminiManifest>,
  item: SeviyeManifestItem,
  fileName: string
) {
  const i = manifest.items.findIndex((x) => x.id === item.id);
  if (i >= 0) {
    manifest.items[i] = {
      ...manifest.items[i],
      status: 'db_applied',
      file: fileName,
      db_applied_at: new Date().toISOString(),
    };
  }
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env'));

  const dryRun = hasFlag('dry-run');
  const force = hasFlag('force');

  if (!fs.existsSync(SEVIYE_GEMINI_MANIFEST_PATH)) {
    throw new Error(`Manifest yok: ${SEVIYE_GEMINI_MANIFEST_PATH}`);
  }

  const manifest = loadSeviyeGeminiManifest();
  const mod = await prisma.module.findUnique({
    where: { slug: SEVIYE_MODULE_SLUG },
    select: { id: true, name: true },
  });
  if (!mod) throw new Error(`Modül yok: ${SEVIYE_MODULE_SLUG}`);

  const seviyeIds = new Set(
    (
      await prisma.word.findMany({
        where: { moduleId: mod.id },
        select: { id: true },
      })
    ).map((w) => w.id)
  );

  const candidates = manifest.items.filter((item) => {
    if (item.status === 'db_applied' && !force) return false;
    if (item.status !== 'ok' && item.status !== 'db_applied') return false;
    if (!seviyeIds.has(item.id)) return false;
    return (
      seviyeGeminiImagePath(item.id) != null ||
      (item.file != null &&
        fs.existsSync(path.join(SEVIYE_GEMINI_OUT_DIR, item.file)))
    );
  });

  console.log(
    `${mod.name}: ${candidates.length} kayıt DB’ye yazılacak (dry-run=${dryRun}, force=${force})`
  );

  let updated = 0;
  let skipped = 0;

  for (const item of candidates) {
    const filePath =
      seviyeGeminiImagePath(item.id) ||
      path.join(SEVIYE_GEMINI_OUT_DIR, item.file || `${item.id}.jpg`);
    if (!fs.existsSync(filePath)) {
      skipped++;
      continue;
    }

    const fileName = path.basename(filePath);
    const imageUrl = seviyeGeminiImageUrl(fileName);
    const imagePrompt =
      `${SEVIYE_GRID_PROMPT_TAG} ${item.prompt || buildSeviyeGeminiPrompt(item.english, item.turkish)}`.slice(
        0,
        500
      );

    if (dryRun) {
      updated++;
      continue;
    }

    await prisma.word.update({
      where: { id: item.id },
      data: { imageUrl, imagePrompt },
    });
    markApplied(manifest, item, fileName);
    updated++;
    if (updated % 200 === 0) {
      saveSeviyeGeminiManifest(manifest);
      console.log(`  … ${updated} kayıt yazıldı`);
    }
  }

  if (!dryRun) saveSeviyeGeminiManifest(manifest);
  console.log(`Bitti. db_guncellenen=${updated} skip=${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
