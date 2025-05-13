import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

function hashPassword(password: string): string {
  const hashed = createHash('sha256').update(password).digest('base64');
  console.log('Hashed password:', hashed);
  return hashed;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    console.log('Login attempt:', { username });

    if (!username || !password) {
      console.log('Missing credentials');
      return NextResponse.json(
        { error: 'Kullanıcı adı ve şifre gereklidir' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    console.log('Found user:', user ? 'Yes' : 'No');

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 401 }
      );
    }

    const hashedInputPassword = hashPassword(password);
    console.log('Password comparison:', {
      stored: user.password,
      input: hashedInputPassword,
      matches: hashedInputPassword === user.password
    });

    const passwordMatch = hashedInputPassword === user.password;

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Şifre yanlış' },
        { status: 401 }
      );
    }

    const cookieStore = cookies();
    cookieStore.set('session', username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    console.log('Login successful');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Giriş yapılırken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get('session');
    const isLoggedIn = !!session?.value;
    console.log('Auth check:', { isLoggedIn, sessionValue: session?.value });
    return NextResponse.json({ isLoggedIn });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ isLoggedIn: false });
  }
} 