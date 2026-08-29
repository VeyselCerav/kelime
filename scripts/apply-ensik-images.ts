/**
 * ensik-gemini-manifest.json + public/ensik-gemini → DB (imageUrl, imagePrompt).
 * Apply öncesi En Sık Çıkan modülündeki eski (gemini olmayan) görseller temizlenir.
 *
 * zsh:
 *   npm run apply-ensik-images
 *   npm run apply-ensik-images -- --dry-run
 *   npm run apply-ensik-images -- --force
 *   npm run apply-ensik-images -- --skip-cleanup
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as fs from 'fs';
import * as path from 'path';
import {
  ENSIK_GEMINI_MANIFEST_PATH,
  ENSIK_GEMINI_OUT_DIR,
  MODULE_SLUG,
  PROMPT_TAG,
  COMFY_PROMPT_TAG,
  buildEnsikGeminiPrompt,
  ensikGeminiImagePath,
  ensikGeminiImageUrl,
  imagePromptTagForItem,
  GEMINI_GRID_PROMPT_TAG,
  loadEnsikGeminiManifest,
  saveEnsikGeminiManifest,
  type EnsikManifestItem,
} from '../lib/ensik-gemini';

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

async function clearLegacyEnsikImages(
  moduleId: number,
  dryRun: boolean
): Promise<number> {
  const legacy = await prisma.word.findMany({
    where: {
      moduleId,
      OR: [{ imageUrl: { not: null } }, { imagePrompt: { not: null } }],
      NOT: {
        OR: [
          { imagePrompt: { startsWith: PROMPT_TAG } },
          { imagePrompt: { startsWith: COMFY_PROMPT_TAG } },
          { imagePrompt: { startsWith: GEMINI_GRID_PROMPT_TAG } },
        ],
      },
    },
    select: { id: true, english: true, imageUrl: true },
  });

  if (legacy.length === 0) {
    console.log('Temizlenecek eski görsel kaydı yok.');
    return 0;
  }

  console.log(
    `${legacy.length} eski görsel kaydı temizlenecek (gemini-cartoon: değil)`
  );

  if (dryRun) {
    for (const w of legacy.slice(0, 5)) {
      console.log(`  dry-clear #${w.id} ${w.english} ← ${w.imageUrl || '(prompt only)'}`);
    }
    if (legacy.length > 5) console.log(`  … ve ${legacy.length - 5} kayıt daha`);
    return legacy.length;
  }

  const result = await prisma.word.updateMany({
    where: {
      moduleId,
      OR: [{ imageUrl: { not: null } }, { imagePrompt: { not: null } }],
      NOT: {
        OR: [
          { imagePrompt: { startsWith: PROMPT_TAG } },
          { imagePrompt: { startsWith: COMFY_PROMPT_TAG } },
          { imagePrompt: { startsWith: GEMINI_GRID_PROMPT_TAG } },
        ],
      },
    },
    data: { imageUrl: null, imagePrompt: null },
  });

  console.log(`Temizlendi: ${result.count} kayıt`);
  return result.count;
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));
  loadEnvFile(path.join(process.cwd(), '.env'));

  const dryRun = hasFlag('dry-run');
  const force = hasFlag('force');
  const skipCleanup = hasFlag('skip-cleanup');

  if (!fs.existsSync(ENSIK_GEMINI_MANIFEST_PATH)) {
    throw new Error(`Manifest yok: ${ENSIK_GEMINI_MANIFEST_PATH}`);
  }

  const manifest = loadEnsikGeminiManifest();
  const mod = await prisma.module.findUnique({
    where: { slug: MODULE_SLUG },
    select: { id: true, name: true },
  });
  if (!mod) throw new Error(`Modül yok: ${MODULE_SLUG}`);

  if (!skipCleanup) {
    await clearLegacyEnsikImages(mod.id, dryRun);
  }

  const ensikIds = new Set(
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
    if (!ensikIds.has(item.id)) return false;
    return (
      ensikGeminiImagePath(item.id) != null ||
      (item.file != null &&
        fs.existsSync(path.join(ENSIK_GEMINI_OUT_DIR, item.file)))
    );
  });

  console.log(
    `${mod.name}: ${candidates.length} kayıt DB’ye yazılacak (dry-run=${dryRun}, force=${force})`
  );

  let updated = 0;
  let skipped = 0;

  for (const item of candidates) {
    const filePath =
      ensikGeminiImagePath(item.id) ||
      path.join(ENSIK_GEMINI_OUT_DIR, item.file || `${item.id}.jpg`);
    if (!fs.existsSync(filePath)) {
      console.warn(`skip #${item.id}: dosya yok`);
      skipped++;
      continue;
    }

    const fileName = path.basename(filePath);
    const imageUrl = ensikGeminiImageUrl(fileName);
    const tag = imagePromptTagForItem(item);
    const imagePrompt = `${tag} ${item.prompt || buildEnsikGeminiPrompt(item.english, item.turkish)}`.slice(
      0,
      500
    );

    if (dryRun) {
      console.log(`dry #${item.id} ${item.english} → ${imageUrl}`);
      updated++;
      continue;
    }

    if (!force) {
      const existing = await prisma.word.findUnique({
        where: { id: item.id },
        select: { imagePrompt: true, moduleId: true, imageUrl: true },
      });
      if (existing?.moduleId !== mod.id) {
        skipped++;
        continue;
      }
      if (
        (existing?.imagePrompt?.startsWith(PROMPT_TAG) ||
          existing?.imagePrompt?.startsWith(COMFY_PROMPT_TAG) ||
          existing?.imagePrompt?.startsWith(GEMINI_GRID_PROMPT_TAG)) &&
        existing.imageUrl === imageUrl
      ) {
        skipped++;
        markApplied(manifest, item, fileName);
        continue;
      }
    }

    await prisma.word.update({
      where: { id: item.id },
      data: { imageUrl, imagePrompt },
    });

    markApplied(manifest, item, fileName);
    saveEnsikGeminiManifest(manifest);
    updated++;
    if (updated % 50 === 0) {
      console.log(`  … ${updated} kayıt yazıldı`);
    }
  }

  if (!dryRun && updated > 0) {
    saveEnsikGeminiManifest(manifest);
  }

  console.log(`Bitti. db_guncellenen=${updated} skip=${skipped}`);
}

function markApplied(
  manifest: ReturnType<typeof loadEnsikGeminiManifest>,
  item: EnsikManifestItem,
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
