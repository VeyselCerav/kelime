import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = 'Mayıs2025***';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  try {
    const admin = await prisma.user.upsert({
      where: { username: 'semihsacli' },
      update: {
        password: hashedPassword
      },
      create: {
        username: 'semihsacli',
        password: hashedPassword,
        email: 'admin@example.com'
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