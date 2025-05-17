import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { t } from '@/lib/i18n';

const prisma = new PrismaClient();

// Email gönderme için transporter oluştur
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

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
        { error: t('auth.errors.userExists') },
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
      },
    });

    // Doğrulama emaili gönder
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${verificationToken}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: t('auth.email.subject'),
      html: `
        <h1>${t('auth.email.welcome')}</h1>
        <p>${t('auth.email.verifyText')}</p>
        <p>${t('auth.email.tokenValidity')}</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">${t('auth.email.verifyButton')}</a>
        <p>${t('auth.email.alternativeLink')}</p>
        <p>${verificationUrl}</p>
      `,
    });

    // Hassas bilgileri çıkar
    const { password: _, verificationToken: __, tokenExpiry: ___, ...userWithoutSensitive } = user;

    return NextResponse.json({
      ...userWithoutSensitive,
      message: t('auth.success.registration')
    });
  } catch (error) {
    console.error('Kayıt hatası:', error);
    return NextResponse.json(
      { error: t('auth.errors.registrationError') },
      { status: 500 }
    );
  }
} 