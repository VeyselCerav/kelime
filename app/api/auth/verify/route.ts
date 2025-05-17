import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { t } from '@/lib/i18n';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: t('auth.errors.tokenNotFound') },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { verificationToken: token }
    });

    if (!user) {
      return NextResponse.json(
        { error: t('auth.errors.invalidToken') },
        { status: 400 }
      );
    }

    if (user.tokenExpiry && user.tokenExpiry < new Date()) {
      return NextResponse.json(
        { error: t('auth.errors.tokenExpired') },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        tokenExpiry: null,
      },
    });

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?verified=true`);
  } catch (error) {
    console.error('Doğrulama hatası:', error);
    return NextResponse.json(
      { error: t('auth.errors.verificationError') },
      { status: 500 }
    );
  }
} 