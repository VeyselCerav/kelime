import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

function hashPassword(password: string): string {
  try {
    const hashed = createHash('sha256').update(password).digest('base64');
    console.log('Hashed password:', hashed);
    return hashed;
  } catch (error) {
    console.error('Hash error:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  console.log('Login API called');
  
  try {
    const body = await request.json();
    console.log('Request body received:', { ...body, password: '[HIDDEN]' });
    
    const { username, password } = body;

    if (!username || !password) {
      console.log('Missing credentials');
      return new NextResponse(
        JSON.stringify({ error: 'Kullanıcı adı ve şifre gereklidir' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Looking up user:', username);
    const user = await prisma.user.findUnique({
      where: { username }
    });

    console.log('User lookup result:', user ? 'User found' : 'User not found');

    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'Kullanıcı bulunamadı' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const hashedInputPassword = hashPassword(password);
    console.log('Password verification:', {
      stored: user.password,
      input: hashedInputPassword,
      matches: hashedInputPassword === user.password
    });

    if (hashedInputPassword !== user.password) {
      return new NextResponse(
        JSON.stringify({ error: 'Şifre yanlış' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Setting cookie');
    const cookieStore = cookies();
    cookieStore.set('session', username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    console.log('Login successful');
    return new NextResponse(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    // Detaylı hata mesajı
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    const errorStack = error instanceof Error ? error.stack : 'Stack yok';
    
    console.error('Detailed error:', {
      message: errorMessage,
      stack: errorStack
    });

    return new NextResponse(
      JSON.stringify({ 
        error: 'Giriş yapılırken bir hata oluştu',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const session = cookieStore.get('session');
    const isLoggedIn = !!session?.value;
    console.log('Auth check:', { isLoggedIn, sessionValue: session?.value });
    return new NextResponse(
      JSON.stringify({ isLoggedIn }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Auth check error:', error);
    return new NextResponse(
      JSON.stringify({ isLoggedIn: false }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 