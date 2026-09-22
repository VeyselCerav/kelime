/**
 * Tüm Ödev push abonelerine bir kerelik hoş geldin / ilk bildirim.
 * node -r dotenv/... veya env yüklü: npx ts-node scripts/send-odev-welcome-push.ts
 */
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as fs from 'fs';
import {
  ODEV_PUSH_URL,
  sendPushPayloadToUserIds,
  userIdsEligibleForOdevPush,
} from '../lib/web-push';

for (const file of ['.env', '.env.local']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  const eligible = await userIdsEligibleForOdevPush();
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: eligible } },
    select: { userId: true, endpoint: true, userAgent: true },
  });
  console.log('eligible', eligible.length, 'subscriptions', subs.length);
  for (const s of subs) {
    const kind = s.endpoint.includes('fcm.googleapis')
      ? 'FCM'
      : s.endpoint.includes('web.push.apple')
        ? 'APNs'
        : 'other';
    console.log('- user', s.userId, kind, (s.userAgent || '').slice(0, 60));
  }

  const userIds = [...new Set(subs.map((s) => s.userId))];
  const result = await sendPushPayloadToUserIds(userIds, {
    title: 'Ödev seni bekliyor',
    body: 'Bildirimler açıldı. Kartlara dokunup bugünkü kelimeleri tekrarla.',
    url: ODEV_PUSH_URL,
    tag: 'odev-welcome-broadcast',
  });
  console.log('result', result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
