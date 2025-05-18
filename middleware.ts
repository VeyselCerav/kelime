import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Korumalı rotalar
const protectedRoutes = [
  '/unlearned-words',
  '/api/learned-words',
  '/api/unlearned-words',
  '/api/daily-goal',
  '/api/progress',
  '/profile',
  '/yonetici'
];

// Admin rotaları
const adminRoutes = ['/yonetici', '/api/words/create', '/api/words/delete'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Korumalı rota kontrolü
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      console.log('Middleware token:', token);

      if (!token) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Oturum açmanız gerekiyor' },
            { status: 401 }
          );
        }

        const url = new URL('/login', request.url);
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
      }

      // Admin sayfası için özel kontrol
      if (adminRoutes.some(route => pathname.startsWith(route))) {
        if (!token.isAdmin) {
          console.log('Admin yetkisi reddedildi:', token);
          return NextResponse.redirect(new URL('/', request.url));
        }
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/unlearned-words/:path*',
    '/api/unlearned-words/:path*',
    '/api/learned-words/:path*',
    '/api/daily-goal/:path*',
    '/api/progress/:path*',
    '/profile/:path*',
    '/yonetici',
    '/yonetici/:path*',
    '/api/words/create/:path*',
    '/api/words/delete/:path*'
  ],
}; 