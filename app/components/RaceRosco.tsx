'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

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
};

type Props = {
  questions: RoscoSource[];
  character: RaceCharacter;
  subtitle?: string;
  onComplete: (result: RoscoResult) => void;
};

function toItems(questions: RoscoSource[]): Item[] {
  return questions.map((q, i) => {
    const english =
      q.english || q.question?.match(/"([^"]+)"/)?.[1] || '';
    const turkish = q.turkish || q.answer || '';
    const raw = q.letter || english.trim().match(/[A-Za-z]/)?.[0] || '?';
    return {
      wordId: q.wordId || q.id || i,
      english,
      turkish,
      letter: raw.toUpperCase(),
    };
  });
}

function normalize(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9çğıöşü]+/gi, '');
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
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<null | 'ok' | 'bad'>(null);
  const [remainMs, setRemainMs] = useState(RACE_TIMER_MS);
  const [ended, setEnded] = useState(false);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const lockRef = useRef(false);
  const statusesRef = useRef(statuses);
  const inputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    inputRef.current?.focus();
  }, [current]);

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
      setInput('');
      const next = nextPlayable(current, nextStatuses);
      lockRef.current = false;
      if (next < 0) {
        finish(nextStatuses);
        return;
      }
      setCurrent(next);
    }, status === 'passed' ? 120 : 700);
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (lockRef.current || doneRef.current || !item) return;
    const guess = normalize(input);
    if (!guess) return;
    const ok = guess === normalize(item.english);
    resolve(ok ? 'correct' : 'wrong');
  };

  const pass = () => {
    if (lockRef.current || doneRef.current) return;
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
                transform: active
                  ? undefined
                  : 'translate(-50%, -50%)',
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
            <form onSubmit={submit} className="mt-3 space-y-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={Boolean(feedback) || ended}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="İngilizce kelime"
                className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-center text-base font-semibold outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={Boolean(feedback) || ended}
                  className="btn-tactile flex-1 rounded-full bg-primary py-3 text-sm font-bold text-on-primary disabled:opacity-40"
                >
                  Cevapla
                </button>
                <button
                  type="button"
                  onClick={pass}
                  disabled={Boolean(feedback) || ended}
                  className="btn-tactile flex-1 rounded-full border border-outline-variant/50 py-3 text-sm font-bold disabled:opacity-40"
                >
                  Pas
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
