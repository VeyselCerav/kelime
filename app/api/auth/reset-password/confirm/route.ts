import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token ve yeni parola gereklidir.' },
        { status: 400 }
      );
    }

    // Token ile kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { verificationToken: token }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Geçersiz veya kullanılmış token.' },
        { status: 400 }
      );
    }

    // Token süresi dolmuş mu kontrol et
    if (user.tokenExpiry && user.tokenExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Token süresi dolmuş. Lütfen yeni bir parola sıfırlama talebi oluşturun.' },
        { status: 400 }
      );
    }

    // Yeni parolayı hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcıyı güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verificationToken: null,
        tokenExpiry: null
      }
    });

    return NextResponse.json({
      message: 'Parolanız başarıyla güncellendi.'
    });
  } catch (error) {
    console.error('Parola güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Parola güncellenirken bir hata oluştu.' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 