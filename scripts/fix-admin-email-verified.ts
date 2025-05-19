import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const admin = await prisma.user.update({
      where: { username: 'semihsacli' },
      data: {
        emailVerified: true
      }
    });

    console.log('Admin kullanıcısının emailVerified alanı güncellendi:', admin);
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 