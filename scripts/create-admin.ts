import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = 'Mayıs2025***';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  try {
    const admin = await prisma.user.upsert({
      where: { username: 'semihsacli' },
      update: {
        password: hashedPassword,
        email: 'haftalikkelime@gmail.com',
        isAdmin: true,
        emailVerified: true
      },
      create: {
        username: 'semihsacli',
        password: hashedPassword,
        email: 'haftalikkelime@gmail.com',
        isAdmin: true,
        emailVerified: true
      }
    });

    console.log('Admin kullanıcısı oluşturuldu:', admin);
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 