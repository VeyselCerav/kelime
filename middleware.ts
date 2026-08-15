import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/** Giriş gerektirmeyen yollar */
const publicExact = new Set([
  '/login',
  '/register',
  '/sw.js',
  '/manifest.webmanifest',
  '/manifest.json',
  '/robots.txt',
]);
const publicPrefixes = ['/auth', '/api/auth'];

const adminPrefixes = [
  '/yonetici',
  '/api/words/create',
  '/api/words/delete',
  '/api/admin',
];

function isPublicPath(pathname: string): boolean {
  if (publicExact.has(pathname)) return true;
  return publicPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAdminPath(pathname: string): boolean {
  return adminPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    // Giriş yapmış kullanıcı login/register’da kalmasın
    if (pathname === '/login' || pathname === '/register') {
      try {
        const token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
        });
        if (token) {
          return NextResponse.redirect(new URL('/', request.url));
        }
      } catch {
        /* ignore */
      }
    }
    return NextResponse.next();
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Oturum açmanız gerekiyor' },
          { status: 401 }
        );
      }
      const url = new URL('/login', request.url);
      if (pathname !== '/') {
        url.searchParams.set('callbackUrl', pathname);
      }
      return NextResponse.redirect(url);
    }

    if (isAdminPath(pathname) && !token.isAdmin) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Oturum hatası' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Statik dosyalar ve Next iç asset’leri hariç her şey
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
