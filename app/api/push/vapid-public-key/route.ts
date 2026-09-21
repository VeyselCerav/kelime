import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/web-push';

export const dynamic = 'force-dynamic';

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: 'VAPID public key tanımlı değil' },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey });
}
