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
    const raw = q.letter || english.trim().match(/[A-Za-z]/)?.[0] || '?';
    let options = Array.isArray(q.options)
      ? q.options.filter((o) => typeof o === 'string' && o.trim())
      : [];
    // Eski maçlarda şıklar Türkçe olabilir; doğru İngilizce cevabı garanti et
    if (english && !options.some((o) => normalize(o) === normalize(english))) {
      options = [...options.filter((o) => normalize(o) !== normalize(english)), english];
    }
    options = [...new Set(options.map((o) => o.trim()).filter(Boolean))];
    if (options.length > 3) {
      const correct = options.find((o) => normalize(o) === normalize(english));
      const rest = options.filter((o) => o !== correct);
      options = shuffleLocal([
        ...(correct ? [correct] : []),
        ...shuffleLocal(rest).slice(0, 2),
      ]);
    } else {
      options = shuffleLocal(options).slice(0, 3);
    }
    return {
      wordId: q.wordId || q.id || i,
      english,
      turkish,
      letter: raw.toUpperCase(),
      options,
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
    <div className="space-y-3">
      {subtitle && (
        <p className="text-center text-sm font-semibold text-secondary">
          {subtitle}
        </p>
      )}

      <div className="relative mx-auto aspect-square w-full max-w-[340px]">
        <div className="absolute left-1/2 top-1/2 z-[1] h-[44%] w-[44%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-4 border-yellow-400 bg-yellow-400 shadow-soft">
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
              className={`absolute flex h-8 w-8 items-center justify-center rounded-full text-sm font-black transition-colors ${
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

      <div className="rounded-card border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-soft">
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-container">
          <div
            className={`h-full rounded-full ${
              urgent ? 'bg-error' : 'bg-primary'
            }`}
            style={{ width: `${remainPct}%` }}
          />
        </div>
        <div className="mb-3 flex items-center justify-between">
          <p
            className={`font-display text-2xl font-bold tabular-nums ${
              urgent ? 'text-error' : 'text-on-surface'
            }`}
          >
            {formatRemain(remainMs)}
          </p>
          <p className="text-xs font-bold text-outline">
            {statuses.filter((s) => s === 'correct').length}/{items.length} doğru
          </p>
        </div>

        {item && (
          <>
            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-outline">
              {item.letter} ile başlar
            </p>
            <p className="mt-1 text-center font-display text-lg font-semibold leading-snug text-on-surface">
              {item.turkish}
            </p>
            {feedback === 'ok' && (
              <p className="mt-2 text-center text-sm font-bold text-primary">
                Doğru! {item.english}
              </p>
            )}
            {feedback === 'bad' && (
              <p className="mt-2 text-center text-sm font-bold text-error">
                Yanlış · doğrusu: {item.english}
              </p>
            )}
            {ended && !feedback && (
              <p className="mt-2 text-center text-sm font-bold text-secondary">
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
                    className={`btn-tactile w-full rounded-2xl border px-4 py-3.5 text-center text-base font-semibold transition disabled:opacity-80 ${style}`}
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
              className="btn-tactile mt-2 w-full rounded-full border border-outline-variant/50 py-3 text-sm font-bold disabled:opacity-40"
            >
              Pas
            </button>
          </>
        )}
      </div>
    </div>
  );
}
