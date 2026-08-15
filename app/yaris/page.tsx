'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useModule } from '../context/ModuleContext';
import Quiz, { QuizQuestion, QuizResultSummary } from '../components/Quiz';
import StudyScopePicker from '../components/StudyScopePicker';

type ReadyUser = { id: number; username: string };
type InviteIn = { id: number; from: ReadyUser; createdAt: string };
type InviteOut = { id: number; to: ReadyUser; createdAt: string };

type MatchPayload = {
  id: number;
  status: string;
  startedAt: string;
  winnerId: number | null;
  questions: QuizQuestion[];
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

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export default function RacePage() {
  const { data: session, status } = useSession();
  const { selectedModuleId, selectedGroupIndex, selectedGroup } = useModule();
  const [ready, setReady] = useState(true);
  const [readyUsers, setReadyUsers] = useState<ReadyUser[]>([]);
  const [incoming, setIncoming] = useState<InviteIn[]>([]);
  const [outgoing, setOutgoing] = useState<InviteOut[]>([]);
  const [error, setError] = useState('');
  const [matchId, setMatchId] = useState<number | null>(null);
  const [match, setMatch] = useState<MatchPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const submittedRef = useRef(false);
  const questionsRef = useRef<QuizQuestion[] | null>(null);
  const matchIdRef = useRef<number | null>(null);

  const heartbeat = useCallback(async () => {
    const res = await fetch('/api/race/lobby', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ready,
        moduleId: selectedModuleId,
        groupIndex: selectedGroupIndex,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setReadyUsers(data.readyUsers || []);
    setIncoming(data.incomingInvites || []);
    setOutgoing(data.outgoingInvites || []);
    if (data.activeMatchId && !matchIdRef.current) {
      matchIdRef.current = data.activeMatchId;
      setMatchId(data.activeMatchId);
    }
  }, [ready, selectedModuleId, selectedGroupIndex]);

  useEffect(() => {
    if (status !== 'authenticated' || matchId) return;
    void heartbeat();
    const t = window.setInterval(() => void heartbeat(), 1500);
    return () => window.clearInterval(t);
  }, [status, matchId, heartbeat]);

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

  const onQuizComplete = async (results: QuizResultSummary) => {
    if (!matchId || submittedRef.current) return;
    submittedRef.current = true;
    await fetch(`/api/race/match/${matchId}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctCount: results.correctAnswers }),
    });
  };

  const backToLobby = () => {
    matchIdRef.current = null;
    questionsRef.current = null;
    setMatchId(null);
    setMatch(null);
    submittedRef.current = false;
    void heartbeat();
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const playing = Boolean(match && match.status === 'playing' && !match.myResult);
  const waitingOpp = Boolean(match && match.myResult && !match.bothFinished);
  const finished = Boolean(match && (match.status === 'finished' || match.bothFinished));

  return (
    <div className="app-shell space-y-6 py-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-on-surface">Yarış</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Aynı 20 soru, en çok doğru kazanır. Eşitlikte daha hızlı olan önde.
        </p>
      </div>

      {error && (
        <p className="rounded-card bg-error/10 p-3 text-sm text-error">{error}</p>
      )}

      {!matchId && (
        <>
          <StudyScopePicker />

          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3">
            <span>
              <span className="block font-display text-sm font-semibold">Hazırım</span>
              <span className="text-xs text-on-surface-variant">
                Kapalıysa başkaları seni göremez
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

          {incoming[0] && (
            <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-4 sm:items-center">
              <div className="w-full max-w-md rounded-card border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-soft">
                <p className="text-center text-[11px] font-bold uppercase tracking-wider text-outline">
                  Yarış daveti
                </p>
                <h2 className="mt-2 text-center font-display text-2xl font-bold text-on-surface">
                  {incoming[0].from.username}
                </h2>
                <p className="mt-2 text-center text-sm text-on-surface-variant">
                  Seni 20 soruluk yarışa davet etti. Kabul edersen aynı sorular
                  ikinize de gelir.
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
          )}

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
              <div className="paper-texture rounded-card border border-outline-variant/40 p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-primary">
                  hourglass_top
                </span>
                <p className="mt-3 font-display text-xl font-semibold">
                  Yarışmacı bekleniyor
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Çevrimiçi ve hazır başka kullanıcı yok. Bu ekranda kal, biri
                  gelince davet atabilirsin.
                </p>
                {selectedGroup && (
                  <p className="mt-3 text-xs text-outline">
                    Davet, senin seçiminle gider: {selectedGroup.label}
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
      )}

      {playing && match && (
        <div>
          <p className="mb-4 text-center text-sm font-semibold text-secondary">
            Rakip: {match.opponent.username}
          </p>
          <Quiz
            key={match.id}
            questions={match.questions}
            isAuthenticated
            examMode
            hideCompleteScreen
            onComplete={(r) => void onQuizComplete(r)}
          />
        </div>
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
            Senin skorun: {match.myResult?.correctCount}/
            {match.questions.length} doğru · {formatMs(match.myResult?.durationMs || 0)}
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
          <button
            type="button"
            onClick={backToLobby}
            className="btn-tactile mt-6 w-full rounded-full bg-primary py-3 font-bold text-on-primary"
          >
            Lobiye dön
          </button>
        </div>
      )}
    </div>
  );
}
