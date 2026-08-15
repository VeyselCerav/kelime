const MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
] as const;

export type GeminiParagraph = {
  title: string;
  english: string;
  turkish: string;
};

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('JSON bulunamadı');
  return JSON.parse(body.slice(start, end + 1));
}

function extractText(data: {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
}): string {
  const candidate = data.candidates?.[0];
  const reason = candidate?.finishReason;
  if (reason && reason !== 'STOP' && reason !== 'MAX_TOKENS') {
    throw new Error(`Gemini bitiş nedeni: ${reason}`);
  }
  const parts = candidate?.content?.parts ?? [];
  return parts
    .map((p) => p.text)
    .filter((t): t is string => Boolean(t && t.trim()))
    .join('\n')
    .trim();
}

function buildPrompt(
  words: { english: string; turkish: string }[]
): string {
  const list = words
    .map((w, i) => `${i + 1}. ${w.english} (${w.turkish})`)
    .join('\n');

  return `You are a professional YDS / English vocabulary coach.

Write ONE simple, coherent English paragraph (80–120 words, CEFR A2–B1) that helps a Turkish learner memorize these target words by seeing them in a natural story.

Target words (use EACH one at least once, EXACT spelling, do not inflect or change the form):
${list}

Then give a natural, fluent Turkish translation of the SAME paragraph (not a word-by-word gloss).

Rules:
- Everyday, memorable context (campus, travel, work, or daily life).
- Short clear sentences. No lists, no bullet points, no definitions.
- Do not add extra rare vocabulary.
- The English paragraph must include every target word with the exact spelling given.

Return ONLY JSON with this shape:
{"title":"short English title","english":"...","turkish":"..."}`;
}

async function generateWithModel(
  model: string,
  apiKey: string,
  prompt: string,
  withThinkingOff = true
): Promise<GeminiParagraph> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22000);

  const generationConfig: Record<string, unknown> = {
    temperature: 0.6,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
  };
  if (withThinkingOff) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`Gemini zaman aşımı (${model})`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  const data = (await res.json()) as {
    error?: { message?: string };
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  if (!res.ok) {
    const msg = data.error?.message || `Gemini ${model} hata: ${res.status}`;
    if (withThinkingOff && /invalid argument|thinking/i.test(msg)) {
      return generateWithModel(model, apiKey, prompt, false);
    }
    throw new Error(msg);
  }

  const text = extractText(data);
  if (!text) throw new Error('Gemini boş yanıt döndü');

  const parsed = extractJson(text) as Partial<GeminiParagraph>;
  const title = String(parsed.title || '').trim();
  const english = String(parsed.english || '').trim();
  const turkish = String(parsed.turkish || '').trim();
  if (!english || !turkish) {
    throw new Error('Gemini yanıtı eksik (english/turkish)');
  }
  return {
    title: title || 'Hikâyen',
    english,
    turkish,
  };
}

export function geminiUserMessage(message: string): string {
  if (/quota|429|resource exhausted/i.test(message)) {
    return 'AI kotası doldu. Birkaç dakika sonra tekrar dene.';
  }
  if (/API[_ ]?KEY|403|401|permission|unauthor/i.test(message)) {
    return 'AI anahtarı geçersiz veya yetkisiz. Vercel GEMINI_API_KEY değerini kontrol et.';
  }
  if (/zaman aşımı|timeout|aborted/i.test(message)) {
    return 'AI yanıtı zaman aşımına uğradı. Tekrar dene.';
  }
  if (/SAFETY|blocked/i.test(message)) {
    return 'Bu kelime kümesi için metin üretilemedi. Birkaç kelimeyi değiştirip dene.';
  }
  return `Paragraf üretilemedi: ${message.slice(0, 180)}`;
}

export async function generateMemoryParagraph(
  words: { english: string; turkish: string }[]
): Promise<GeminiParagraph> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY tanımlı değil');
  }

  const prompt = buildPrompt(words);
  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      return await generateWithModel(model, apiKey, prompt);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.error(`Gemini ${model} başarısız:`, lastError.message);
    }
  }

  throw lastError || new Error('Gemini isteği başarısız');
}
