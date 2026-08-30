/**
 * modul-gemini-manifest + public/modul-gemini → DB imageUrl
 *
 * PowerShell:
 *   npm run apply-module-images
 *   npm run apply-module-images -- --dry-run
 *   npm run apply-module-images -- --force
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as fs from 'fs';
import * as path from 'path';
import {
  MODUL_GEMINI_MANIFEST_PATH,
  MODUL_GEMINI_OUT_DIR,
  MODUL_GRID_PROMPT_TAG,
  buildModulGeminiPrompt,
  loadModulGeminiManifest,
  saveModulGeminiManifest,
  modulGeminiImagePath,
  modulGeminiImageUrl,
  type ModulManifestItem,
} from '../lib/modul-gemini';

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
  manifest: ReturnType<typeof loadModulGeminiManifest>,
  item: ModulManifestItem,
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

  if (!fs.existsSync(MODUL_GEMINI_MANIFEST_PATH)) {
    throw new Error(`Manifest yok: ${MODUL_GEMINI_MANIFEST_PATH}`);
  }

  const manifest = loadModulGeminiManifest();
  const candidates = manifest.items.filter((item) => {
    if (item.status === 'db_applied' && !force) return false;
    if (item.status !== 'ok' && item.status !== 'db_applied') return false;
    return (
      modulGeminiImagePath(item.id) != null ||
      (item.file != null &&
        fs.existsSync(path.join(MODUL_GEMINI_OUT_DIR, item.file)))
    );
  });

  console.log(
    `${candidates.length} kayıt DB’ye yazılacak (dry-run=${dryRun}, force=${force})`
  );

  let updated = 0;
  let skipped = 0;

  for (const item of candidates) {
    const filePath =
      modulGeminiImagePath(item.id) ||
      path.join(MODUL_GEMINI_OUT_DIR, item.file || `${item.id}.jpg`);
    if (!fs.existsSync(filePath)) {
      skipped++;
      continue;
    }

    const fileName = path.basename(filePath);
    const imageUrl = modulGeminiImageUrl(fileName);
    const imagePrompt =
      `${MODUL_GRID_PROMPT_TAG} ${item.prompt || buildModulGeminiPrompt(item.english, item.turkish)}`.slice(
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
      saveModulGeminiManifest(manifest);
      console.log(`  … ${updated} kayıt yazıldı`);
    }
  }

  if (!dryRun) saveModulGeminiManifest(manifest);
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
