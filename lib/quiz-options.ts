/** Quiz şık üretimi — doğru cevap ve kopyalar tekil */

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/**
 * Doğru cevap + en fazla `wrongCount` benzersiz çeldirici.
 * Aynı metin (trim/case) tekrar etmez; sonuç en fazla wrongCount+1 şık.
 * Yeterli çeldirici yoksa placeholder eklemez (3–4 şık kalabilir).
 */
export function buildUniqueOptions(
  answer: string,
  distractorCandidates: string[],
  wrongCount = 3,
  padPlaceholders = false
): string[] {
  const correct = answer.trim();
  const correctNorm = norm(correct);
  const seen = new Set<string>(correctNorm ? [correctNorm] : []);
  const wrong: string[] = [];

  for (const raw of shuffle(distractorCandidates)) {
    const t = (raw || '').trim();
    if (!t) continue;
    const n = norm(t);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    wrong.push(t);
    if (wrong.length >= wrongCount) break;
  }

  if (padPlaceholders) {
    while (wrong.length < wrongCount) {
      wrong.push(`opt${wrong.length}`);
    }
  }

  return shuffle([correct, ...wrong.slice(0, wrongCount)]);
}

/** UI: en fazla 4 benzersiz şık; doğru cevap her zaman listede */
export function sanitizeQuizOptions(
  options: string[] | undefined,
  answer: string
): string[] {
  const correct = (answer || '').trim();
  const correctNorm = norm(correct);
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of options || []) {
    const t = (raw || '').trim();
    if (!t) continue;
    const n = norm(t);
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(t);
    if (out.length >= 4) break;
  }

  if (correct && !seen.has(correctNorm)) {
    if (out.length >= 4) out[0] = correct;
    else out.push(correct);
  } else if (correct) {
    const i = out.findIndex((o) => norm(o) === correctNorm);
    if (i >= 0) out[i] = correct;
  }

  return out.slice(0, 4);
}
