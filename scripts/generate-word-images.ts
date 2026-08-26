/**
 * POC: İlk N kelime için Gemini ile çağrıştırıcı görsel üret → public/word-images → DB.
 *
 * PowerShell:
 *   $env:GEMINI_API_KEY="..."
 *   $env:DATABASE_URL_Three="..."
 *   npm run generate-word-images
 *
 * Seçenekler:
 *   --limit=20          (varsayılan 20)
 *   --force             imageUrl olsa da yeniden üret
 *   --export=words.json sadece JSON dışa aktar, üretme
 *   --input=words.json  JSON’dan id listesi ile üret
 */

import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient().$extends(withAccelerate());

const IMAGE_MODELS = [
  'gemini-3.1-flash-image',
  'gemini-3.1-flash-lite-image',
  'gemini-2.5-flash-image',
] as const;

const TEXT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
] as const;

function argValue(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geminiJson(
  apiKey: string,
  prompt: string
): Promise<{ prompt: string }> {
  let lastErr = 'text model başarısız';
  for (const model of TEXT_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 256,
            responseMimeType: 'application/json',
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        lastErr = data?.error?.message || res.statusText;
        continue;
      }
      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text)
          .filter(Boolean)
          .join('\n') || '';
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('JSON yok');
      const parsed = JSON.parse(text.slice(start, end + 1)) as {
        prompt?: string;
      };
      if (!parsed.prompt?.trim()) throw new Error('prompt boş');
      return { prompt: parsed.prompt.trim() };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastErr);
}

async function geminiImage(
  apiKey: string,
  scenePrompt: string
): Promise<{ mimeType: string; base64: string }> {
  const full = `Create a single evocative, cinematic photograph-like image (no text, no letters, no watermark) that helps a Turkish learner remember an English vocabulary word through atmosphere and symbolism.

Scene: ${scenePrompt}

Style: soft natural light, shallow depth of field, muted colors, educational flashcard background, 3:4 portrait.`;

  let lastErr = 'image model başarısız';
  for (const model of IMAGE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: full }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        lastErr = data?.error?.message || res.statusText;
        continue;
      }
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        const inline = part.inlineData || part.inline_data;
        if (inline?.data) {
          return {
            mimeType: inline.mimeType || inline.mime_type || 'image/png',
            base64: inline.data,
          };
        }
      }
      lastErr = `${model}: görsel part yok`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastErr);
}

async function fetchPollinationsImage(
  scenePrompt: string
): Promise<{ mimeType: string; base64: string }> {
  const q = encodeURIComponent(scenePrompt.slice(0, 200));
  const url = `https://image.pollinations.ai/prompt/${q}?width=768&height=1024&nologo=true&enhance=true`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Pollinations ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error('Pollinations boş görsel');
  const mimeType = res.headers.get('content-type') || 'image/jpeg';
  return { mimeType, base64: buf.toString('base64') };
}

let geminiImageDisabled = false;

async function generateImageBytes(
  apiKey: string,
  scenePrompt: string
): Promise<{ mimeType: string; base64: string; source: string }> {
  if (!geminiImageDisabled) {
    try {
      const img = await geminiImage(apiKey, scenePrompt);
      return { ...img, source: 'gemini' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/quota|429|RESOURCE_EXHAUSTED/i.test(msg)) {
        geminiImageDisabled = true;
        console.warn('  Gemini görsel kota yok → kalanlar Pollinations');
      } else {
        console.warn('  Gemini görsel hata → Pollinations:', msg.slice(0, 80));
      }
    }
  }
  const img = await fetchPollinationsImage(scenePrompt);
  return { ...img, source: 'pollinations' };
}

function extFromMime(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'png';
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const limit = Math.max(1, parseInt(argValue('limit') || '20', 10) || 20);
  const force = hasFlag('force');
  const exportPath = argValue('export');
  const inputPath = argValue('input');

  const outDir = path.join(process.cwd(), 'public', 'word-images');
  fs.mkdirSync(outDir, { recursive: true });

  type Row = { id: number; english: string; turkish: string; imageUrl: string | null };

  let words: Row[];

  if (inputPath) {
    const raw = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
    const list = Array.isArray(raw) ? raw : raw.words;
    if (!Array.isArray(list)) throw new Error('JSON dizi olmalı');
    const ids = list.map((w: { id: number }) => Number(w.id)).filter(Boolean);
    words = await prisma.word.findMany({
      where: { id: { in: ids } },
      select: { id: true, english: true, turkish: true, imageUrl: true },
      orderBy: { id: 'asc' },
    });
  } else {
    words = await prisma.word.findMany({
      where: force ? undefined : { imageUrl: null },
      select: { id: true, english: true, turkish: true, imageUrl: true },
      orderBy: { id: 'asc' },
      take: limit,
    });
  }

  if (exportPath) {
    const payload = words.map((w) => ({
      id: w.id,
      english: w.english,
      turkish: w.turkish,
    }));
    fs.writeFileSync(
      path.resolve(exportPath),
      JSON.stringify(payload, null, 2),
      'utf8'
    );
    console.log(`Export: ${payload.length} kelime → ${exportPath}`);
    return;
  }

  if (!apiKey) throw new Error('GEMINI_API_KEY tanımlı değil');
  if (words.length === 0) {
    console.log('İşlenecek kelime yok (hepsi dolu veya limit=0).');
    return;
  }

  console.log(`Üretilecek: ${words.length} kelime (limit=${limit}, force=${force})`);

  let ok = 0;
  let fail = 0;

  for (const word of words) {
    if (word.imageUrl && !force) {
      console.log(`skip #${word.id} ${word.english}`);
      continue;
    }
    try {
      const scene = await geminiJson(
        apiKey,
        `English vocab word: "${word.english}" (Turkish: ${word.turkish}).
Return ONLY JSON: {"prompt":"one short vivid visual scene description in English, no text in image, concrete objects and atmosphere that help remember this word"}`
      );

      const image = await generateImageBytes(apiKey, scene.prompt);
      const ext = extFromMime(image.mimeType);
      const fileName = `${word.id}.${ext}`;
      const filePath = path.join(outDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(image.base64, 'base64'));
      const imageUrl = `/word-images/${fileName}`;

      await prisma.word.update({
        where: { id: word.id },
        data: {
          imageUrl,
          imagePrompt: scene.prompt.slice(0, 500),
        },
      });

      ok += 1;
      console.log(
        `ok #${word.id} ${word.english} → ${imageUrl} (${image.source})`
      );
      await sleep(800);
    } catch (e) {
      fail += 1;
      console.error(
        `fail #${word.id} ${word.english}:`,
        e instanceof Error ? e.message : e
      );
      await sleep(1200);
    }
  }

  console.log(`Bitti. ok=${ok} fail=${fail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
