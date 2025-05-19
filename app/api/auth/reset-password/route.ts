import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

const prisma = new PrismaClient();

// Rate limiting için basit bir Map kullanıyoruz
const resetAttempts = new Map<string, { count: number; timestamp: number }>();

// Rate limiting kontrolü
const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 dakika
  const maxAttempts = 3; // IP başına maksimum deneme

  const attempts = resetAttempts.get(ip) || { count: 0, timestamp: now };

  // Zaman penceresi dışındaysa sıfırla
  if (now - attempts.timestamp > windowMs) {
    resetAttempts.set(ip, { count: 1, timestamp: now });
    return false;
  }

  // Maksimum deneme sayısını aştıysa limit uygula
  if (attempts.count >= maxAttempts) {
    return true;
  }

  // Deneme sayısını artır
  resetAttempts.set(ip, { count: attempts.count + 1, timestamp: attempts.timestamp });
  return false;
};

export async function POST(request: Request) {
  try {
    // IP adresini al (headers'dan veya forwarded-for'dan)
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown-ip';

    // Rate limiting kontrolü
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Çok fazla deneme yaptınız. Lütfen 15 dakika sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    // Email ile kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Bu email adresiyle kayıtlı kullanıcı bulunamadı.' },
        { status: 404 }
      );
    }

    // Sıfırlama tokeni oluştur
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat geçerli

    // Kullanıcıyı güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: resetToken,
        tokenExpiry
      }
    });

    // Sıfırlama emaili gönder
    const emailSent = await sendPasswordResetEmail(email, resetToken);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Email gönderilirken bir hata oluştu.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Parola sıfırlama bağlantısı email adresinize gönderildi.'
    });
  } catch (error) {
    console.error('Parola sıfırlama hatası:', error);
    return NextResponse.json(
      { error: 'Parola sıfırlama işlemi sırasında bir hata oluştu.' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 