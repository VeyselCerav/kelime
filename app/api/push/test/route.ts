import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/race-session';
import {
  ODEV_PUSH_URL,
  sendPushToUserId,
  userCanReceiveOdevPush,
} from '@/lib/web-push';

export const dynamic = 'force-dynamic';

/** Giriş yapmış Ödev kullanıcısına test / hoş geldin bildirimi */
export async function POST(request: Request) {
  const auth = await requireUserId();
  if ('error' in auth) return auth.error;

  const eligible = await userCanReceiveOdevPush(auth.userId);
  if (!eligible) {
    return NextResponse.json(
      { error: 'Ödev bildirimi için yetkiniz yok' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const welcome = Boolean(body.welcome);

  const result = await sendPushToUserId(auth.userId, {
    title: welcome ? 'Ödev hatırlatması açıldı' : 'Test bildirimi',
    body: welcome
      ? 'Artık 08:00–22:00 arası her saat “Tekrar seni bekliyor” gelecek.'
      : 'Bildirimler çalışıyor. Ödev’e dokununca kartlara gideceksin.',
    url: ODEV_PUSH_URL,
    tag: welcome ? 'odev-welcome' : 'odev-test',
  });

  if (result.sent === 0) {
    return NextResponse.json(
      {
        error:
          result.gone > 0
            ? 'Eski abonelik geçersiz. Bildirimleri kapatıp yeniden aç.'
            : 'Abonelik yok. Önce bildirimleri aç.',
        ...result,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
