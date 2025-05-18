import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { username, password, email } = await request.json();

    // Kullanıcı adı ve email kontrolü
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu kullanıcı adı veya email zaten kullanımda' },
        { status: 400 }
      );
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Doğrulama tokeni oluştur
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat geçerli

    // Yeni kullanıcı oluştur
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        verificationToken,
        tokenExpiry,
        emailVerified: null // Email doğrulanana kadar null
      },
    });

    // Doğrulama emaili gönder
    const emailSent = await sendVerificationEmail(email, verificationToken);

    if (!emailSent) {
      // Email gönderilemezse kullanıcıyı sil
      await prisma.user.delete({
        where: { id: user.id }
      });
      
      return NextResponse.json(
        { error: 'Doğrulama emaili gönderilemedi. Lütfen daha sonra tekrar deneyin.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Kayıt başarılı! Lütfen email adresinizi doğrulayın.',
      emailSent: true
    });

  } catch (error) {
    console.error('Kayıt hatası:', error);
    return NextResponse.json(
      { error: 'Kayıt sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
} 