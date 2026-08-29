/**
 * public/ensik-gemini/ içindeki tüm kelime görsellerini kart boyutuna (3:4) getirir.
 *
 * PowerShell:
 *   npm run resize-ensik-card-images
 *   npm run resize-ensik-card-images -- --dry-run
 */
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { ENSIK_GEMINI_OUT_DIR } from '../lib/ensik-gemini';
import {
  WORD_CARD_IMAGE_HEIGHT,
  WORD_CARD_IMAGE_WIDTH,
} from '../lib/word-image-url';

const IMAGE_RE = /\.(jpe?g|png|webp)$/i;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const files = fs
    .readdirSync(ENSIK_GEMINI_OUT_DIR)
    .filter((f) => IMAGE_RE.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (files.length === 0) {
    console.error('Görsel bulunamadı:', ENSIK_GEMINI_OUT_DIR);
    process.exit(1);
  }

  console.log(
    `${files.length} dosya → ${WORD_CARD_IMAGE_WIDTH}×${WORD_CARD_IMAGE_HEIGHT}${dryRun ? ' (dry-run)' : ''}`
  );

  let ok = 0;
  for (const file of files) {
    const inPath = path.join(ENSIK_GEMINI_OUT_DIR, file);
    const meta = await sharp(inPath).metadata();
    const already =
      meta.width === WORD_CARD_IMAGE_WIDTH &&
      meta.height === WORD_CARD_IMAGE_HEIGHT;

    if (already) {
      ok++;
      continue;
    }

    if (dryRun) {
      console.log(`[resize] ${file} (${meta.width}×${meta.height})`);
      ok++;
      continue;
    }

    const tmpPath = `${inPath}.resize-tmp.jpg`;
    await sharp(inPath)
      .resize(WORD_CARD_IMAGE_WIDTH, WORD_CARD_IMAGE_HEIGHT, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(tmpPath);

    fs.renameSync(tmpPath, inPath.replace(/\.(png|webp)$/i, '.jpg'));
    ok++;
    if (ok % 100 === 0) console.log(`  … ${ok}/${files.length}`);
  }

  console.log(`\nTamam: ${ok}/${files.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
