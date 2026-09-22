/** Client: Ödev antrenman event’i (fire-and-forget) */
export type OdevClientEvent = {
  wordId: number;
  type: 'quiz_ok' | 'quiz_fail' | 'card_show' | 'flip' | 'learn' | 'unlearn';
  durationMs?: number;
  flipped?: boolean;
};

export function trackOdevEvent(event: OdevClientEvent): void {
  if (typeof window === 'undefined') return;
  if (!event.wordId || !event.type) return;
  void fetch('/api/odev/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {});
}
