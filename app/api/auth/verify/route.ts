import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Doğrulama tokeni bulunamadı' },
        { status: 400 }
      );
    }

    // Token ile kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { verificationToken: token }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Geçersiz veya kullanılmış doğrulama tokeni' },
        { status: 400 }
      );
    }

    // Token süresi dolmuş mu kontrol et
    if (user.tokenExpiry && user.tokenExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Doğrulama tokeninin süresi dolmuş. Lütfen yeniden kayıt olun.' },
        { status: 400 }
      );
    }

    // Kullanıcıyı doğrulanmış olarak işaretle
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        tokenExpiry: null,
      },
    });

    return NextResponse.json({ 
      message: 'Email adresi başarıyla doğrulandı',
      verified: true
    });
  } catch (error) {
    console.error('Doğrulama hatası:', error);
    return NextResponse.json(
      { error: 'Doğrulama işlemi sırasında bir hata oluştu' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 