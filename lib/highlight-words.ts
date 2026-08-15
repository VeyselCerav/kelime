export type HighlightWord = {
  id: number;
  english: string;
  turkish: string;
};

export type TextPart =
  | { type: 'text'; value: string }
  | { type: 'word'; value: string; word: HighlightWord };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Paragrafı hedef kelimelere göre parçala (büyük/küçük harf duyarsız). */
export function splitHighlighted(
  text: string,
  words: HighlightWord[]
): TextPart[] {
  if (!text || !words.length) return [{ type: 'text', value: text }];

  const unique = new Map<string, HighlightWord>();
  for (const w of words) {
    const key = w.english.trim().toLowerCase();
    if (key && !unique.has(key)) unique.set(key, w);
  }

  const terms = Array.from(unique.keys()).sort((a, b) => b.length - a.length);
  if (!terms.length) return [{ type: 'text', value: text }];

  const pattern = new RegExp(
    `\\b(${terms.map(escapeRegExp).join('|')})\\b`,
    'gi'
  );

  const parts: TextPart[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) });
    }
    const value = match[0];
    const word = unique.get(value.toLowerCase());
    if (word) {
      parts.push({ type: 'word', value, word });
    } else {
      parts.push({ type: 'text', value });
    }
    last = match.index + value.length;
  }
  if (last < text.length) {
    parts.push({ type: 'text', value: text.slice(last) });
  }
  return parts.length ? parts : [{ type: 'text', value: text }];
}
