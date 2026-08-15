import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 }) };
  }
  const userId = parseInt(session.user.id, 10);
  if (Number.isNaN(userId)) {
    return { error: NextResponse.json({ error: 'Geçersiz kullanıcı' }, { status: 400 }) };
  }
  return { userId };
}
