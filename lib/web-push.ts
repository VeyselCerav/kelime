import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { ODEV_SLUG } from '@/lib/odev';

export const ODEV_PUSH_TITLE = 'Tekrar seni bekliyor';
export const ODEV_PUSH_BODY = 'Ödev kelimelerini tekrar etmeye hazır mısın?';
/** Bildirime tıklanınca Ödev / Kartlar */
export const ODEV_PUSH_URL = '/flashcards?module=odev';

export function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

function getVapidConfig(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@ydsmonster.app';
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

let configured = false;

function ensureWebPushConfigured(): boolean {
  const cfg = getVapidConfig();
  if (!cfg) return false;
  if (!configured) {
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    configured = true;
  }
  return true;
}

/** Ödev yetkisi olan kullanıcılar (+ admin) */
export async function userIdsEligibleForOdevPush(): Promise<number[]> {
  const odev = await prisma.module.findUnique({
    where: { slug: ODEV_SLUG },
    select: { id: true },
  });
  if (!odev) return [];

  const [admins, access] = await Promise.all([
    prisma.user.findMany({
      where: { isAdmin: true },
      select: { id: true },
    }),
    prisma.moduleAccess.findMany({
      where: { moduleId: odev.id },
      select: { userId: true },
    }),
  ]);

  return [...new Set([...admins.map((a) => a.id), ...access.map((a) => a.userId)])];
}

export async function userCanReceiveOdevPush(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true },
  });
  if (!user) return false;
  if (user.isAdmin) return true;

  const odev = await prisma.module.findUnique({
    where: { slug: ODEV_SLUG },
    select: { id: true },
  });
  if (!odev) return false;

  const row = await prisma.moduleAccess.findUnique({
    where: { moduleId_userId: { moduleId: odev.id, userId } },
    select: { id: true },
  });
  return Boolean(row);
}

/** Europe/Istanbul saat diliminde 08:00–22:00 (dahil) mi? */
export function isOdevPushHourIstanbul(date = new Date()): boolean {
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    hour12: false,
  }).format(date);
  const hour = parseInt(hourStr, 10);
  return hour >= 8 && hour <= 22;
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<'ok' | 'gone' | 'error'> {
  if (!ensureWebPushConfigured()) return 'error';

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60, urgency: 'normal' }
    );
    return 'ok';
  } catch (err: unknown) {
    const status =
      err && typeof err === 'object' && 'statusCode' in err
        ? Number((err as { statusCode: number }).statusCode)
        : 0;
    if (status === 404 || status === 410) return 'gone';
    console.error('web-push error', status || err);
    return 'error';
  }
}

export async function sendOdevReminderToUserIds(userIds: number[]): Promise<{
  sent: number;
  gone: number;
  errors: number;
}> {
  if (!ensureWebPushConfigured() || userIds.length === 0) {
    return { sent: 0, gone: 0, errors: 0 };
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  const payload: PushPayload = {
    title: ODEV_PUSH_TITLE,
    body: ODEV_PUSH_BODY,
    url: ODEV_PUSH_URL,
    tag: 'odev-reminder',
  };

  let sent = 0;
  let gone = 0;
  let errors = 0;
  const goneEndpoints: string[] = [];

  for (const sub of subs) {
    const result = await sendPushToSubscription(sub, payload);
    if (result === 'ok') sent += 1;
    else if (result === 'gone') {
      gone += 1;
      goneEndpoints.push(sub.endpoint);
    } else errors += 1;
  }

  if (goneEndpoints.length) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: goneEndpoints } },
    });
  }

  return { sent, gone, errors };
}
