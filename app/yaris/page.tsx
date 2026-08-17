'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useModule } from '../context/ModuleContext';
import StudyScopePicker from '../components/StudyScopePicker';
import RaceRosco, {
  RaceCharacter,
  RoscoMiss,
  RoscoResult,
  RoscoSource,
} from '../components/RaceRosco';

const CHAR_KEY = 'yds-race-char';

type RaceMode = 'practice' | 'versus';

type ReadyUser = { id: number; username: string };
type InviteIn = { id: number; from: ReadyUser; createdAt: string };
type InviteOut = { id: number; to: ReadyUser; createdAt: string };

type MatchPayload = {
  id: number;
  status: string;
  startedAt: string;
  winnerId: number | null;
  questions: RoscoSource[];
  me: ReadyUser;
  opponent: ReadyUser;
  myResult: {
    correctCount: number;
    durationMs: number;
    won: boolean;
    draw: boolean;
    points: number;
  } | null;
  opponentResult: {
    correctCount: number;
    durationMs: number;
    won: boolean;
    draw: boolean;
    points: number;
  } | null;
  bothFinished: boolean;
};

type SoloState = {
  questions: RoscoSource[];
  result: RoscoResult | null;
};

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function MissedAnswers({ items }: { items: RoscoMiss[] }) {
  const wrong = items.filter((m) => m.kind === 'wrong');
  const skipped = items.filter((m) => m.kind === 'skipped');
  if (wrong.length === 0 && skipped.length === 0) return null;

  const Block = ({
    title,
    rows,
  }: {
    title: string;
    rows: RoscoMiss[];
  }) =>
    rows.length === 0 ? null : (
      <div className="mt-4 text-left">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-outline">
          {title}
        </p>
        <ul className="space-y-2">
          {rows.map((m, i) => (
            <li
              key={`${m.letter}-${m.english}-${i}`}
              className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5"
            >
              <p className="text-xs font-bold text-outline">{m.letter} ile başlar</p>
              <p className="text-sm text-on-surface-variant">{m.turkish}</p>
              <p className="mt-0.5 font-semibold text-primary">
                Doğrusu: {m.english}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <>
      <Block title="Yanlışların doğrusu" rows={wrong} />
      <Block title="Pas / boş kalanlar" rows={skipped} />
    </>
  );
}

function readChar(): RaceCharacter {
  if (typeof window === 'undefined') return 'male';
  return window.localStorage.getItem(CHAR_KEY) === 'female' ? 'female' : 'male';
}

export default function RacePage() {
  const { status } = useSession();
  const { selectedModuleId, selectedGroupIndex, selectedGroup } = useModule();
  const [ready, setReady] = useState(true);
  const [readyUsers, setReadyUsers] = useState<ReadyUser[]>([]);
  const [incoming, setIncoming] = useState<InviteIn[]>([]);
  const [outgoing, setOutgoing] = useState<InviteOut[]>([]);
  const [error, setError] = useState('');
  const [matchId, setMatchId] = useState<number | null>(null);
  const [match, setMatch] = useState<MatchPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [character, setCharacter] = useState<RaceCharacter>('male');
  const [mode, setMode] = useState<RaceMode | null>(null);
  const [solo, setSolo] = useState<SoloState | null>(null);
  const [matchLocked, setMatchLocked] = useState(false);
  const [review, setReview] = useState<RoscoMiss[]>([]);
  const submittedRef = useRef(false);
  const questionsRef = useRef<RoscoSource[] | null>(null);
  const matchIdRef = useRef<number | null>(null);

  useEffect(() => {
    setCharacter(readChar());
  }, []);

  const pickCharacter = (next: RaceCharacter) => {
    setCharacter(next);
    window.localStorage.setItem(CHAR_KEY, next);
  };

  const inGame = Boolean(matchId || (solo && !solo.result));

  const heartbeat = useCallback(async () => {
    const res = await fetch('/api/race/lobby', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ready: (mode === 'practice' || mode === 'versus') && ready && !inGame,
        moduleId: selectedModuleId,
        groupIndex: selectedGroupIndex,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setReadyUsers(data.readyUsers || []);
    setIncoming(data.incomingInvites || []);
    setOutgoing(data.outgoingInvites || []);
    if (data.activeMatchId && !matchIdRef.current && !solo) {
      matchIdRef.current = data.activeMatchId;
      setMode((prev) => prev ?? 'versus');
      setMatchLocked(false);
      setMatchId(data.activeMatchId);
    }
  }, [ready, selectedModuleId, selectedGroupIndex, inGame, solo, mode]);

  useEffect(() => {
    if (status !== 'authenticated' || inGame) return;
    void heartbeat();
    const t = window.setInterval(() => void heartbeat(), 1500);
    return () => window.clearInterval(t);
  }, [status, inGame, heartbeat]);

  useEffect(() => {
    if (!matchId) return;
    let stop = false;
    const tick = async () => {
      const res = await fetch(`/api/race/match/${matchId}`, { cache: 'no-store' });
      if (!res.ok || stop) return;
      const data = (await res.json()) as MatchPayload;
      setMatch((prev) => {
        if (prev && prev.id === data.id && prev.questions.length) {
          return { ...data, questions: prev.questions };
        }
        questionsRef.current = data.questions;
        return data;
      });
    };
    void tick();
    const t = window.setInterval(() => void tick(), 1500);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [matchId]);

  const invite = async (toUserId: number) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/race/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId,
          moduleId: selectedModuleId,
          groupIndex: selectedGroupIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Davet gönderilemedi');
      void heartbeat();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setBusy(false);
    }
  };

  const respond = async (id: number, action: 'accept' | 'decline' | 'cancel') => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/race/invite/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız');
      if (data.matchId) {
        submittedRef.current = false;
        questionsRef.current = null;
        matchIdRef.current = data.matchId;
        setSolo(null);
        setMode((prev) => prev ?? 'versus');
        setMatchLocked(false);
        setMatchId(data.matchId);
      } else {
        void heartbeat();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setBusy(false);
    }
  };

  const startSolo = async () => {
    setBusy(true);
    setError('');
    try {
      await fetch('/api/race/lobby', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ready: false,
          moduleId: selectedModuleId,
          groupIndex: selectedGroupIndex,
        }),
      });
      const res = await fetch('/api/race/solo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: selectedModuleId,
          groupIndex: selectedGroupIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Oyun başlatılamadı');
      setMode('practice');
      setSolo({ questions: data.questions, result: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata');
    } finally {
      setBusy(false);
    }
  };

  const onMatchComplete = async (result: RoscoResult) => {
    if (!matchId || submittedRef.current) return;
    submittedRef.current = true;
    setMatchLocked(true);
    setReview(result.missed || []);
    await fetch(`/api/race/match/${matchId}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctCount: result.correctCount,
        durationMs: result.durationMs,
      }),
    });
  };

  const backToLobby = () => {
    matchIdRef.current = null;
    questionsRef.current = null;
    setMatchId(null);
    setMatch(null);
    setSolo(null);
    setMatchLocked(false);
    setReview([]);
    submittedRef.current = false;
    void heartbeat();
  };

  const backToModes = () => {
    backToLobby();
    setMode(null);
    setReady(true);
    setError('');
  };

  const characterPicker = (
    <section>
      <h2 className="mb-2 font-display text-lg font-semibold">Karakterin</h2>
      <div className="grid grid-cols-2 gap-3">
        {(['male', 'female'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => pickCharacter(id)}
            className={`btn-tactile overflow-hidden rounded-card border-2 bg-yellow-400 text-left ${
              character === id
                ? 'border-primary shadow-soft'
                : 'border-transparent opacity-80'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={id === 'female' ? '/race/female.png' : '/race/male.png'}
              alt={id === 'female' ? 'Kadın karakter' : 'Erkek karakter'}
              className="h-36 w-full object-cover object-top"
            />
            <span className="block bg-surface-container-lowest px-3 py-2 text-center text-sm font-bold">
              {id === 'female' ? 'Kadın' : 'Erkek'}
            </span>
          </button>
        ))}
      </div>
    </section>
  );

  const lobbyPlayers = (
    <>
      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3">
        <span>
          <span className="block font-display text-sm font-semibold">Hazırım</span>
          <span className="text-xs text-on-surface-variant">
            Açıkken başkaları seni davet edebilir
          </span>
        </span>
        <input
          type="checkbox"
          className="sr-only"
          checked={ready}
          onChange={(e) => setReady(e.target.checked)}
        />
        <span
          className={`relative h-7 w-12 shrink-0 rounded-full ${
            ready ? 'bg-primary' : 'bg-outline-variant/60'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow ${
              ready ? 'left-5' : 'left-0.5'
            }`}
          />
        </span>
      </label>

      {outgoing.length > 0 && (
        <div className="rounded-card border border-outline-variant/30 bg-surface-container-lowest p-4">
          {outgoing.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-2">
              <p className="text-sm">
                <span className="font-semibold">{inv.to.username}</span> yanıtı
                bekleniyor…
              </p>
              <button
                type="button"
                onClick={() => void respond(inv.id, 'cancel')}
                className="text-xs font-bold text-error"
              >
                İptal
              </button>
            </div>
          ))}
        </div>
      )}

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">Hazır yarışmacılar</h2>
        {readyUsers.length === 0 ? (
          <div className="paper-texture rounded-card border border-outline-variant/40 p-6 text-center">
            <span className="material-symbols-outlined text-3xl text-primary">
              hourglass_top
            </span>
            <p className="mt-2 font-display text-lg font-semibold">
              Şu an rakip yok
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Biri gelince davet at; ikiniz de 120 saniye oynarsınız.
            </p>
            {selectedGroup && (
              <p className="mt-2 text-xs text-outline">
                Oyun grubu: {selectedGroup.label}
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {readyUsers.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3"
              >
                <span className="font-semibold text-primary">{u.username}</span>
                <button
                  type="button"
                  disabled={busy || !ready}
                  onClick={() => void invite(u.id)}
                  className="btn-tactile rounded-full bg-secondary-container px-4 py-2 text-sm font-bold text-on-secondary-container disabled:opacity-40"
                >
                  Davet et
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );

  const inviteOverlay = incoming[0] && !inGame && !solo && (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-card border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-soft">
        <p className="text-center text-[11px] font-bold uppercase tracking-wider text-outline">
          Yarış daveti
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-bold text-on-surface">
          {incoming[0].from.username}
        </h2>
        <p className="mt-2 text-center text-sm text-on-surface-variant">
          Seni harf çemberine davet etti. Kabul edersen ikiniz de aynı 20
          kelimeyle 120 saniye oynarsınız.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void respond(incoming[0].id, 'accept')}
            className="btn-tactile flex-1 rounded-full bg-primary py-3 text-sm font-bold text-on-primary"
          >
            Kabul et
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void respond(incoming[0].id, 'decline')}
            className="btn-tactile flex-1 rounded-full border border-outline-variant/50 py-3 text-sm font-bold"
          >
            Reddet
          </button>
        </div>
      </div>
    </div>
  );

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const finished = Boolean(match && (match.status === 'finished' || match.bothFinished));
  const playing = Boolean(
    match && match.status === 'playing' && !match.myResult && !matchLocked
  );
  const waitingOpp = Boolean(
    match && !finished && (match.myResult || matchLocked)
  );
  const soloPlaying = Boolean(solo && !solo.result);
  const soloDone = Boolean(solo?.result);

  return (
    <div className="app-shell space-y-6 py-4">
      {inviteOverlay}

      {!playing && !soloPlaying && (
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            {mode === 'practice'
              ? 'Antrenman'
              : mode === 'versus'
                ? 'Rakiple yarış'
                : 'Yarış'}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {mode === 'practice'
              ? 'Tek oyna veya birini davet et. İkiniz de 120 saniye, aynı çember.'
              : mode === 'versus'
                ? 'Çevrimiçi rakip davet et. Her maçta modülden yeni 20 kelime gelir.'
                : 'Antrenman mı, yoksa rakiple yarış mı?'}
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-card bg-error/10 p-3 text-sm text-error">{error}</p>
      )}

      {!matchId && !solo && mode === null && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setError('');
              setMode('practice');
            }}
            className="btn-tactile paper-texture w-full rounded-card border border-outline-variant/40 p-5 text-left"
          >
            <span className="material-symbols-outlined text-4xl text-primary">
              fitness_center
            </span>
            <span className="mt-3 block font-display text-xl font-bold">
              Antrenman
            </span>
            <span className="mt-1 block text-sm text-on-surface-variant">
              Tek oyna veya ikinci kişiyi davet et. Karşılıklı 120 saniye, aynı
              harf çemberi.
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setError('');
              setMode('versus');
            }}
            className="btn-tactile paper-texture w-full rounded-card border border-outline-variant/40 p-5 text-left"
          >
            <span className="material-symbols-outlined text-4xl text-secondary">
              swords
            </span>
            <span className="mt-3 block font-display text-xl font-bold">
              Rakiple yarış
            </span>
            <span className="mt-1 block text-sm text-on-surface-variant">
              Hazır oyuncuları gör, davet at. Her maçta yeni 20 kelime; eşitlikte
              daha hızlı olan önde.
            </span>
          </button>
        </div>
      )}

      {!matchId && !solo && mode === 'practice' && (
        <>
          <button
            type="button"
            onClick={backToModes}
            className="text-sm font-bold text-primary"
          >
            ← Mod seç
          </button>
          <StudyScopePicker />
          {characterPicker}
          <button
            type="button"
            disabled={busy || !selectedModuleId}
            onClick={() => void startSolo()}
            className="btn-tactile w-full rounded-full bg-primary py-3 font-bold text-on-primary disabled:opacity-40"
          >
            Tek başına başla
          </button>
          {lobbyPlayers}
        </>
      )}

      {!matchId && !solo && mode === 'versus' && (
        <>
          <button
            type="button"
            onClick={backToModes}
            className="text-sm font-bold text-primary"
          >
            ← Mod seç
          </button>
          <StudyScopePicker />
          {characterPicker}
          {lobbyPlayers}
        </>
      )}

      {playing && match && (
        <RaceRosco
          key={`match-${match.id}`}
          questions={match.questions}
          character={character}
          subtitle={`Rakip: ${match.opponent.username} · 120 sn`}
          onComplete={(r) => void onMatchComplete(r)}
        />
      )}

      {soloPlaying && solo && (
        <RaceRosco
          key="solo"
          questions={solo.questions}
          character={character}
          subtitle="Antrenman · 120 saniye"
          onComplete={(result) =>
            setSolo((prev) => (prev ? { ...prev, result } : prev))
          }
        />
      )}

      {waitingOpp && match && (
        <div className="paper-texture rounded-card border border-outline-variant/40 p-8 text-center">
          <span className="material-symbols-outlined animate-pulse text-4xl text-primary">
            sports_score
          </span>
          <h2 className="mt-3 font-display text-xl font-semibold">
            Rakip çözüyor…
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            {match.myResult
              ? `Senin skorun: ${match.myResult.correctCount}/${match.questions.length} doğru · ${formatMs(match.myResult.durationMs || 0)}`
              : 'Skorun kaydediliyor…'}
          </p>
        </div>
      )}

      {finished && match && (
        <div className="paper-texture rounded-card border border-outline-variant/40 p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-primary">
            emoji_events
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold">
            {match.myResult?.draw
              ? 'Berabere'
              : match.myResult?.won
                ? 'Kazandın!'
                : 'Kaybettin'}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-primary-container/20 p-3">
              <p className="text-xs text-outline">Sen</p>
              <p className="font-bold">
                {match.myResult?.correctCount}/{match.questions.length}
              </p>
              <p className="text-xs">{formatMs(match.myResult?.durationMs || 0)}</p>
            </div>
            <div className="rounded-2xl bg-surface-container p-3">
              <p className="text-xs text-outline">{match.opponent.username}</p>
              <p className="font-bold">
                {match.opponentResult?.correctCount}/{match.questions.length}
              </p>
              <p className="text-xs">
                {formatMs(match.opponentResult?.durationMs || 0)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-primary">
            +{match.myResult?.points ?? 0} puan
          </p>
          <MissedAnswers items={review} />
          <button
            type="button"
            onClick={backToLobby}
            className="btn-tactile mt-6 w-full rounded-full bg-primary py-3 font-bold text-on-primary"
          >
            Lobiye dön
          </button>
          <button
            type="button"
            onClick={backToModes}
            className="mt-3 w-full py-2 text-sm font-bold text-primary"
          >
            Mod seç
          </button>
        </div>
      )}

      {soloDone && solo?.result && (
        <div className="paper-texture rounded-card border border-outline-variant/40 p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-primary">
            military_tech
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold">Antrenman bitti</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            {solo.result.correctCount}/{solo.questions.length} doğru ·{' '}
            {formatMs(solo.result.durationMs)}
          </p>
          <MissedAnswers items={solo.result.missed || []} />
          <button
            type="button"
            onClick={backToLobby}
            className="btn-tactile mt-6 w-full rounded-full bg-primary py-3 font-bold text-on-primary"
          >
            Antrenmana dön
          </button>
          <button
            type="button"
            onClick={backToModes}
            className="mt-3 w-full py-2 text-sm font-bold text-primary"
          >
            Mod seç
          </button>
        </div>
      )}
    </div>
  );
}
