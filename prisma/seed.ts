import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = 'yds-kelime-app';
  return crypto.createHash('sha256').update(password + salt).digest('base64');
}

const words = [
  { english: 'abandon', turkish: 'terk etmek', week: 1 },
  { english: 'ability', turkish: 'yetenek', week: 1 },
  { english: 'abroad', turkish: 'yurtdışı', week: 1 },
  { english: 'absence', turkish: 'yokluk', week: 1 },
  { english: 'absolute', turkish: 'kesin', week: 1 },
  { english: 'academic', turkish: 'akademik', week: 1 },
  { english: 'accept', turkish: 'kabul etmek', week: 1 },
  { english: 'access', turkish: 'erişim', week: 1 },
  { english: 'accident', turkish: 'kaza', week: 1 },
  { english: 'accompany', turkish: 'eşlik etmek', week: 1 },
  { english: 'achieve', turkish: 'başarmak', week: 2 },
  { english: 'acknowledge', turkish: 'kabul etmek', week: 2 },
  { english: 'acquire', turkish: 'edinmek', week: 2 },
  { english: 'adapt', turkish: 'uyum sağlamak', week: 2 },
  { english: 'add', turkish: 'eklemek', week: 2 },
  { english: 'adequate', turkish: 'yeterli', week: 2 },
  { english: 'adjust', turkish: 'ayarlamak', week: 2 },
  { english: 'admire', turkish: 'hayran olmak', week: 2 },
  { english: 'admit', turkish: 'kabul etmek', week: 2 },
  { english: 'adopt', turkish: 'benimsemek', week: 2 },
];

async function main() {
  try {
    // Admin kullanıcısını oluştur
    const hashedPassword = await bcrypt.hash('Mayıs2025***', 10);
    
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

    console.log('Admin kullanıcısı oluşturuldu:', admin.username);

    // Kelimeleri ekle
    for (const word of words) {
      await prisma.word.create({
        data: word,
      });
    }

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Seed hatası:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 