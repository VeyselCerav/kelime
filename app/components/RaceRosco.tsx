'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const RACE_TIMER_MS = 120_000;

export type RaceCharacter = 'male' | 'female';

export type RoscoSource = {
  id: number;
  wordId: number;
  question?: string;
  answer?: string;
  english?: string;
  turkish?: string;
  letter?: string;
  options?: string[];
};

export type RoscoMiss = {
  letter: string;
  turkish: string;
  english: string;
  kind: 'wrong' | 'skipped';
};

export type RoscoResult = {
  correctCount: number;
  durationMs: number;
  missed: RoscoMiss[];
};

type LetterStatus = 'pending' | 'passed' | 'correct' | 'wrong';

type Item = {
  wordId: number;
  english: string;
  turkish: string;
  letter: string;
  options: string[];
};

type Props = {
  questions: RoscoSource[];
  character: RaceCharacter;
  subtitle?: string;
  onComplete: (result: RoscoResult) => void;
};

function shuffleLocal<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9çğıöşü]+/gi, '');
}

function toItems(questions: RoscoSource[]): Item[] {
  return questions.map((q, i) => {
    const english =
      q.english || q.answer || q.question?.match(/"([^"]+)"/)?.[1] || '';
    const turkish = q.turkish || '';
    const letter = (
      q.letter ||
      english.trim().match(/[A-Za-z]/)?.[0] ||
      '?'
    ).toUpperCase();
    const correctNorm = normalize(english);

    let options = Array.isArray(q.options)
      ? q.options.filter((o) => typeof o === 'string' && o.trim())
      : [];

    // Aynı harf + tek doğru
    options = options.filter((o) => {
      const first = o.trim().match(/[A-Za-z]/)?.[0];
      return first && first.toUpperCase() === letter;
    });

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const opt of options) {
      const n = normalize(opt);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      unique.push(opt.trim());
    }

    let correct = unique.find((o) => normalize(o) === correctNorm);
    if (!correct && english) {
      correct = english.trim();
      unique.unshift(correct);
    }
    const wrongs = unique.filter((o) => normalize(o) !== correctNorm);
    const finalOpts = shuffleLocal([
      correct!,
      ...shuffleLocal(wrongs).slice(0, 2),
    ]).filter(Boolean);

    return {
      wordId: q.wordId || q.id || i,
      english,
      turkish,
      letter,
      options: finalOpts.slice(0, 3),
    };
  });
}

function formatRemain(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function nextPlayable(from: number, statuses: LetterStatus[]) {
  const n = statuses.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (statuses[i] === 'pending' || statuses[i] === 'passed') return i;
  }
  return -1;
}

export default function RaceRosco({
  questions,
  character,
  subtitle,
  onComplete,
}: Props) {
  const items = useMemo(() => toItems(questions), [questions]);
  const [statuses, setStatuses] = useState<LetterStatus[]>(() =>
    items.map(() => 'pending')
  );
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<null | 'ok' | 'bad'>(null);
  const [remainMs, setRemainMs] = useState(RACE_TIMER_MS);
  const [ended, setEnded] = useState(false);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const lockRef = useRef(false);
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;

  const finish = (st = statusesRef.current) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setEnded(true);
    const correctCount = st.filter((s) => s === 'correct').length;
    const missed: RoscoMiss[] = items.flatMap((entry, i) => {
      const s = st[i];
      if (s === 'correct') return [];
      return [
        {
          letter: entry.letter,
          turkish: entry.turkish,
          english: entry.english,
          kind: s === 'wrong' ? 'wrong' : 'skipped',
        },
      ];
    });
    onComplete({
      correctCount,
      durationMs: Math.min(RACE_TIMER_MS, Date.now() - startRef.current),
      missed,
    });
  };

  useEffect(() => {
    const t = window.setInterval(() => {
      const left = RACE_TIMER_MS - (Date.now() - startRef.current);
      if (left <= 0) {
        setRemainMs(0);
        finish();
        return;
      }
      setRemainMs(left);
    }, 200);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item = items[current];
  const urgent = remainMs <= 15_000;

  const resolve = (status: LetterStatus) => {
    if (lockRef.current || doneRef.current || !item) return;
    lockRef.current = true;
    const nextStatuses = statuses.map((s, i) => (i === current ? status : s));
    setStatuses(nextStatuses);
    statusesRef.current = nextStatuses;
    setFeedback(status === 'correct' ? 'ok' : status === 'wrong' ? 'bad' : null);

    window.setTimeout(() => {
      setFeedback(null);
      setPicked(null);
      const next = nextPlayable(current, nextStatuses);
      lockRef.current = false;
      if (next < 0) {
        finish(nextStatuses);
        return;
      }
      setCurrent(next);
    }, status === 'passed' ? 120 : 700);
  };

  const choose = (option: string) => {
    if (lockRef.current || doneRef.current || !item || feedback) return;
    setPicked(option);
    const ok = normalize(option) === normalize(item.english);
    resolve(ok ? 'correct' : 'wrong');
  };

  const pass = () => {
    if (lockRef.current || doneRef.current || feedback) return;
    resolve('passed');
  };

  const src = character === 'female' ? '/race/female.png' : '/race/male.png';
  const remainPct = Math.max(0, (remainMs / RACE_TIMER_MS) * 100);

  return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2.5">
      {subtitle && (
        <p className="text-center text-sm font-semibold text-secondary">
          {subtitle}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 px-1">
        <p
          className={`font-display text-2xl font-bold tabular-nums sm:text-3xl ${
            urgent ? 'text-error' : 'text-on-surface'
          }`}
        >
          {formatRemain(remainMs)}
        </p>
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-container">
          <div
            className={`h-full rounded-full ${
              urgent ? 'bg-error' : 'bg-primary'
            }`}
            style={{ width: `${remainPct}%` }}
          />
        </div>
        <p className="shrink-0 text-sm font-bold text-outline">
          {statuses.filter((s) => s === 'correct').length}/{items.length}
        </p>
      </div>

      <div className="relative mx-auto aspect-square w-[min(100%,260px)] sm:w-[min(100%,300px)]">
        <div className="absolute left-1/2 top-1/2 z-[1] h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-[3px] border-yellow-400 bg-yellow-400 shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={character === 'female' ? 'Kadın karakter' : 'Erkek karakter'}
            className="h-full w-full object-cover object-top"
          />
        </div>

        {items.map((letterItem, i) => {
          const n = items.length || 1;
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
          const left = 50 + 46 * Math.cos(angle);
          const top = 50 + 46 * Math.sin(angle);
          const st = statuses[i];
          const active = i === current && !ended;
          return (
            <span
              key={`${letterItem.wordId}-${i}`}
              className={`absolute flex h-8 w-8 items-center justify-center rounded-full text-sm font-black transition-colors sm:h-9 sm:w-9 sm:text-base ${
                active
                  ? 'rosco-active bg-yellow-300 text-on-surface'
                  : st === 'correct'
                    ? 'bg-primary text-on-primary'
                    : st === 'wrong'
                      ? 'bg-error text-white'
                      : st === 'passed'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'border border-outline-variant/50 bg-surface-container-lowest text-on-surface'
              }`}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: active ? undefined : 'translate(-50%, -50%)',
              }}
            >
              {letterItem.letter}
            </span>
          );
        })}
      </div>

      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-soft">
        {item && (
          <>
            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-outline">
              {item.letter} ile başlar
            </p>
            <p className="mt-1 text-center font-display text-lg font-semibold leading-snug text-on-surface sm:text-xl">
              {item.turkish}
            </p>
            {feedback === 'ok' && (
              <p className="mt-1.5 text-center text-base font-bold text-primary">
                Doğru! {item.english}
              </p>
            )}
            {feedback === 'bad' && (
              <p className="mt-1.5 text-center text-base font-bold text-error">
                Yanlış · doğrusu: {item.english}
              </p>
            )}
            {ended && !feedback && (
              <p className="mt-1.5 text-center text-base font-bold text-secondary">
                Tur bitti
              </p>
            )}

            <div className="mt-3 grid gap-2">
              {item.options.map((opt) => {
                const isPicked = picked === opt;
                const isCorrectOpt =
                  normalize(opt) === normalize(item.english);
                let style =
                  'border-outline-variant/40 bg-surface hover:border-primary';
                if (feedback && isCorrectOpt) {
                  style =
                    'border-primary bg-primary-container/30 text-primary';
                } else if (feedback && isPicked && !isCorrectOpt) {
                  style = 'border-error bg-error/10 text-error';
                } else if (isPicked && !feedback) {
                  style = 'border-primary bg-primary-container/20';
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={Boolean(feedback) || ended}
                    onClick={() => choose(opt)}
                    className={`btn-tactile w-full rounded-xl border px-4 py-3.5 text-center text-base font-semibold transition disabled:opacity-80 sm:text-lg ${style}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={pass}
              disabled={Boolean(feedback) || ended}
              className="btn-tactile mt-3 w-full rounded-full bg-error py-3.5 text-base font-bold text-white shadow-soft transition hover:bg-error/90 disabled:opacity-40"
            >
              Pas
            </button>
          </>
        )}
      </div>
    </div>
  );
}
