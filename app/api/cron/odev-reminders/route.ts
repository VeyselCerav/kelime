import { NextResponse } from 'next/server';
import {
  isOdevPushHourIstanbul,
  sendOdevReminderToUserIds,
  userIdsEligibleForOdevPush,
} from '@/lib/web-push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

async function runReminders() {
  if (!isOdevPushHourIstanbul()) {
    return {
      skipped: true,
      reason: 'outside_08_22_istanbul',
      sent: 0,
      gone: 0,
      errors: 0,
    };
  }

  const userIds = await userIdsEligibleForOdevPush();
  const result = await sendOdevReminderToUserIds(userIds);
  return { skipped: false, recipients: userIds.length, ...result };
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runReminders();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runReminders();
  return NextResponse.json(result);
}
