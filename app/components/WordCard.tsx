'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scroll-lock';
import { resolveWordImageUrl, WORD_CARD_IMAGE_HEIGHT, WORD_CARD_IMAGE_WIDTH } from '@/lib/word-image-url';

/** Ekran genişliğinin ~%22’si; min 72 / max 140 */
function swipeThreshold(): number {
  if (typeof window === 'undefined') return 100;
  return Math.min(140, Math.max(72, window.innerWidth * 0.22));
}

interface WordCardProps {
  english: string;
  turkish: string;
  wordId: number;
  isAuthenticated?: boolean;
  onActionComplete?: () => void;
  progressLabel?: string;
  onProgressSaved?: () => void;
  isFavorite?: boolean;
  onFavoriteChange?: (wordId: number, favorited: boolean) => void;
  /** Web Speech ile İngilizce telaffuz (yalnızca kartlar / favoriler) */
  showPronounce?: boolean;
  /** Çağrıştırıcı arka plan görseli */
  imageUrl?: string | null;
  /** Kart görseli: en-sik-cikan ve seviye-seviye */
  moduleSlug?: string | null;
}

function speakEnglish(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return false;
  }
  window.speechSynthesis.cancel();

  const speak = () => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const en =
      voices.find((v) => v.lang === 'en-US') ||
      voices.find((v) => v.lang.startsWith('en'));
    if (en) utter.voice = en;
    window.speechSynthesis.speak(utter);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', speak, {
      once: true,
    });
    // iOS bazen voiceschanged vermez; yine de dene
    speak();
  } else {
    speak();
  }
  return true;
}

export default function WordCard({
  english,
  turkish,
  wordId,
  onActionComplete,
  progressLabel,
  onProgressSaved,
  isFavorite = false,
  onFavoriteChange,
  showPronounce = false,
  imageUrl,
  moduleSlug,
}: WordCardProps) {
  const { data: session } = useSession();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [favorite, setFavorite] = useState(isFavorite);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null);

  const startX = useRef(0);
  const startY = useRef(0);
  const offsetRef = useRef(0);
  const movedRef = useRef(false);
  const axisRef = useRef<'none' | 'x' | 'y'>('none');
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const exitDirRef = useRef<'left' | 'right' | null>(null);
  const markingRef = useRef(false);
  const sessionRef = useRef(session);
  const wordIdRef = useRef(wordId);
  const onActionCompleteRef = useRef(onActionComplete);
  const onProgressSavedRef = useRef(onProgressSaved);
  const scrollLockedRef = useRef(false);

  const releaseScrollLock = () => {
    if (!scrollLockedRef.current) return;
    scrollLockedRef.current = false;
    unlockBodyScroll();
  };

  const acquireScrollLock = () => {
    if (scrollLockedRef.current) return;
    scrollLockedRef.current = true;
    lockBodyScroll();
  };

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    wordIdRef.current = wordId;
  }, [wordId]);
  useEffect(() => {
    onActionCompleteRef.current = onActionComplete;
  }, [onActionComplete]);
  useEffect(() => {
    onProgressSavedRef.current = onProgressSaved;
  }, [onProgressSaved]);
  useEffect(() => {
    markingRef.current = isMarking;
  }, [isMarking]);

  useEffect(() => {
    setIsFlipped(false);
    setOffsetX(0);
    setExitDir(null);
    setError('');
    setIsDragging(false);
    setFavorite(isFavorite);
    setSpeaking(false);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    offsetRef.current = 0;
    movedRef.current = false;
    axisRef.current = 'none';
    draggingRef.current = false;
    pointerIdRef.current = null;
    exitDirRef.current = null;
    releaseScrollLock();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // releaseScrollLock kasıtlı: word değişince kilidi aç
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordId, isFavorite]);

  useEffect(() => {
    return () => {
      if (scrollLockedRef.current) {
        scrollLockedRef.current = false;
        unlockBodyScroll();
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playPronounce = () => {
    if (!showPronounce) return;
    setError('');
    const ok = speakEnglish(english);
    if (!ok) {
      setError('Bu cihazda sesli okuma desteklenmiyor');
      return;
    }
    setSpeaking(true);
    window.setTimeout(() => setSpeaking(false), 1200);
  };

  const toggleFavorite = async () => {
    if (!session) {
      setError('Favori için oturum açmanız gerekiyor');
      return;
    }
    if (favoriting || isMarking || exitDir) return;
    setFavoriting(true);
    setError('');
    const next = !favorite;
    try {
      const res = await fetch('/api/favorites', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Favori güncellenemedi');
      }
      setFavorite(next);
      onFavoriteChange?.(wordId, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata oluştu');
    } finally {
      setFavoriting(false);
    }
  };

  const resetCard = () => {
    offsetRef.current = 0;
    setOffsetX(0);
    setExitDir(null);
    exitDirRef.current = null;
    setIsDragging(false);
    draggingRef.current = false;
    releaseScrollLock();
  };

  const markAsUnlearned = async () => {
    if (!sessionRef.current) {
      setError('Kaydetmek için oturum açmanız gerekiyor');
      onActionCompleteRef.current?.();
      return;
    }
    setIsMarking(true);
    setError('');
    const id = wordIdRef.current;
    try {
      await fetch('/api/learned-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: id, isLearned: false }),
        credentials: 'include',
      });
      await fetch('/api/unlearned-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: id }),
        credentials: 'include',
      });
      onActionCompleteRef.current?.();
      onProgressSavedRef.current?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata oluştu');
      resetCard();
    } finally {
      setIsMarking(false);
    }
  };

  const markAsLearned = async () => {
    if (!sessionRef.current) {
      setError('Kaydetmek için oturum açmanız gerekiyor');
      onActionCompleteRef.current?.();
      return;
    }
    setIsMarking(true);
    setError('');
    const id = wordIdRef.current;
    try {
      const response = await fetch('/api/learned-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: id, isLearned: true }),
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Hata');
      }
      onActionCompleteRef.current?.();
      onProgressSavedRef.current?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hata oluştu');
      resetCard();
    } finally {
      setIsMarking(false);
    }
  };

  const markLearnedRef = useRef(markAsLearned);
  const markUnlearnedRef = useRef(markAsUnlearned);
  markLearnedRef.current = markAsLearned;
  markUnlearnedRef.current = markAsUnlearned;

  const commitSwipe = (dir: 'left' | 'right') => {
    if (exitDirRef.current || markingRef.current) return;
    exitDirRef.current = dir;
    setExitDir(dir);
    const fly = typeof window !== 'undefined' ? Math.max(window.innerWidth, 420) : 480;
    offsetRef.current = dir === 'right' ? fly : -fly;
    setOffsetX(offsetRef.current);
    window.setTimeout(() => {
      if (dir === 'right') void markLearnedRef.current();
      else void markUnlearnedRef.current();
    }, 200);
  };

  const commitSwipeRef = useRef(commitSwipe);
  commitSwipeRef.current = commitSwipe;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || pointerIdRef.current !== e.pointerId) return;
      if (exitDirRef.current || markingRef.current) return;

      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      if (axisRef.current === 'none') {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        axisRef.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        // Yatay kaydırma: sayfa kilidi. Dikey: kilidi bırak (sayfa kayabilsin).
        if (axisRef.current === 'x') acquireScrollLock();
        else releaseScrollLock();
      }

      if (axisRef.current === 'y') return;

      movedRef.current = true;
      e.preventDefault();
      offsetRef.current = dx;
      setOffsetX(dx);
    };

    const finishPointer = (e: PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      if (!draggingRef.current) return;

      draggingRef.current = false;
      setIsDragging(false);
      pointerIdRef.current = null;

      const axis = axisRef.current;
      const moved = movedRef.current;

      if (axis !== 'x' || !moved) {
        if (!moved && axis !== 'y') {
          setIsFlipped((f) => !f);
        }
        offsetRef.current = 0;
        setOffsetX(0);
        axisRef.current = 'none';
        movedRef.current = false;
        releaseScrollLock();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      const dx = offsetRef.current;
      const threshold = swipeThreshold();
      if (dx >= threshold) {
        commitSwipeRef.current('right');
        // Sonraki karta geçene kadar kilit kalsın; wordId effect açar
      } else if (dx <= -threshold) {
        commitSwipeRef.current('left');
      } else {
        offsetRef.current = 0;
        setOffsetX(0);
        releaseScrollLock();
      }

      axisRef.current = 'none';
      movedRef.current = false;
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };

    // Kart üzerinde parmak varken Android pull-to-refresh’i kes
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      if (axisRef.current === 'y') return;
      e.preventDefault();
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', finishPointer);
    window.addEventListener('pointercancel', finishPointer);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finishPointer);
      window.removeEventListener('pointercancel', finishPointer);
      window.removeEventListener('touchmove', onTouchMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (markingRef.current || exitDirRef.current) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    pointerIdRef.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
    offsetRef.current = 0;
    movedRef.current = false;
    axisRef.current = 'none';
    draggingRef.current = true;
    setIsDragging(true);
    setOffsetX(0);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const rotation = Math.max(-14, Math.min(14, offsetX / 16));
  const threshold = swipeThreshold();
  const learnedHint = Math.min(1, Math.max(0, offsetX / threshold));
  const unlearnedHint = Math.min(1, Math.max(0, -offsetX / threshold));
  const bgImage = resolveWordImageUrl(imageUrl, moduleSlug);
  const [bgFailed, setBgFailed] = useState(false);

  useEffect(() => {
    setBgFailed(false);
  }, [imageUrl, wordId]);

  return (
    <div className="flex w-full flex-col items-center">
      {progressLabel && (
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          {progressLabel}
        </p>
      )}

      <div className="relative mx-auto w-full max-w-md overscroll-y-contain sm:max-w-lg">
        <div
          className="perspective-1000 relative z-0 aspect-[3/4] w-full select-none"
          style={{
            touchAction: 'none',
            WebkitUserSelect: 'none',
            overscrollBehavior: 'none',
          }}
        >
          <div
            className="pointer-events-none absolute inset-y-8 left-2 z-10 flex items-center"
            style={{ opacity: unlearnedHint }}
            aria-hidden
          >
            <span className="rounded-full bg-error/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-soft">
              Ezberleyemedim
            </span>
          </div>
          <div
            className="pointer-events-none absolute inset-y-8 right-2 z-10 flex items-center"
            style={{ opacity: learnedHint }}
            aria-hidden
          >
            <span className="rounded-full bg-tertiary/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-soft">
              Ezberledim
            </span>
          </div>

          <div
            aria-label="Kelime kartı. Kaydır veya dokunarak çevir."
            className={`flashcard-inner paper-stack relative z-0 h-full w-full cursor-grab active:cursor-grabbing ${
              isFlipped ? 'is-flipped' : ''
            } ${isDragging || exitDir ? '' : 'transition-transform duration-200 ease-out'}`}
            style={{
              touchAction: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              transform: isFlipped
                ? `translate3d(${offsetX}px, 0, 0) rotate(${rotation}deg) rotateY(180deg)`
                : `translate3d(${offsetX}px, 0, 0) rotate(${rotation}deg)`,
              opacity: exitDir ? 0.35 : 1,
              willChange: isDragging ? 'transform' : undefined,
            }}
            onPointerDown={onPointerDown}
          >
            <div
              className={`flashcard-face relative flex flex-col items-center justify-center overflow-hidden rounded-card border border-outline-variant p-6 shadow-soft ${
                bgImage && !bgFailed ? 'bg-[#1a2420]' : 'paper-texture'
              }`}
            >
              {bgImage && !bgFailed && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bgImage}
                    alt=""
                    width={WORD_CARD_IMAGE_WIDTH}
                    height={WORD_CARD_IMAGE_HEIGHT}
                    className="word-card-front-image pointer-events-none absolute inset-0 h-full w-full"
                    draggable={false}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => setBgFailed(true)}
                  />
                  <div
                    className="word-card-image-scrim pointer-events-none absolute inset-0"
                    aria-hidden
                  />
                </>
              )}
              <h1
                className={`relative z-10 mt-8 text-center font-display text-4xl font-bold italic sm:text-5xl ${
                  bgImage && !bgFailed ? 'word-card-image-text' : 'text-primary'
                }`}
              >
                {english}
              </h1>
              <div
                className={`absolute bottom-4 z-10 flex items-center gap-1 ${
                  bgImage && !bgFailed ? 'word-card-image-text text-white/80' : 'text-on-surface-variant/50'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  swipe
                </span>
                <span className="text-xs font-bold">Kaydır veya dokun</span>
              </div>
            </div>

            <div className="flashcard-face flashcard-back paper-texture relative flex flex-col items-center justify-center overflow-hidden rounded-card border border-outline-variant p-6 text-center shadow-soft">
              <div className="relative z-10 mb-4 rounded-full border-2 border-primary-container px-4 py-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  Anlam
                </span>
              </div>
              <h2 className="relative z-10 mb-3 font-display text-2xl font-bold text-on-surface sm:text-3xl">
                {turkish}
              </h2>
              <p className="relative z-10 max-w-[240px] text-sm italic text-secondary">
                {english}
              </p>
            </div>
          </div>
        </div>

        {/* Favori: sağ üst — Ses: sağ alt (swipe/flip ile hareket etmez) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-end px-3 pt-3">
          <button
            type="button"
            disabled={favoriting || isMarking || !!exitDir}
            aria-label={favorite ? 'Favoriden çıkar' : 'Favoriye ekle'}
            onClick={() => void toggleFavorite()}
            className={`pointer-events-auto btn-tactile flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white shadow-soft disabled:opacity-50 ${
              favorite
                ? 'border-secondary text-secondary'
                : 'border-outline-variant/50 text-on-surface-variant'
            }`}
          >
            <span
              className="material-symbols-outlined text-[26px]"
              style={
                favorite ? { fontVariationSettings: "'FILL' 1" } : undefined
              }
            >
              star
            </span>
          </button>
        </div>

        {showPronounce && (
          <div className="pointer-events-none absolute bottom-3 right-3 z-30">
            <button
              type="button"
              disabled={isMarking || !!exitDir}
              aria-label="Telaffuzu dinle"
              onClick={() => playPronounce()}
              className={`pointer-events-auto btn-tactile flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white shadow-soft disabled:opacity-50 ${
                speaking
                  ? 'border-primary text-primary'
                  : 'border-outline-variant/50 text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[26px]">
                volume_up
              </span>
            </button>
          </div>
        )}
      </div>

      {isMarking && (
        <p className="mt-4 text-sm text-on-surface-variant">Kaydediliyor…</p>
      )}
      {error && <p className="mt-3 text-center text-sm text-error">{error}</p>}
    </div>
  );
}
