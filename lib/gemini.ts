const MODELS = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
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

function buildPrompt(
  words: { english: string; turkish: string }[]
): string {
  const list = words
    .map((w, i) => `${i + 1}. ${w.english} (${w.turkish})`)
    .join('\n');

  return `You are a professional YDS / English vocabulary coach.

Write ONE simple, coherent English paragraph (90–140 words, CEFR A2–B1) that helps a Turkish learner memorize these target words by seeing them in a natural story.

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
  prompt: string
): Promise<GeminiParagraph> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  const data = (await res.json()) as {
    error?: { message?: string };
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini ${model} hata: ${res.status}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
    }
  }

  throw lastError || new Error('Gemini isteği başarısız');
}
