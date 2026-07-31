import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  const genel = await prisma.module.upsert({
    where: { slug: 'genel' },
    update: {},
    create: {
      slug: 'genel',
      name: 'Genel Kelimeler',
      description: 'Mevcut kelime bankası',
      sortOrder: 0,
    },
  });

  await prisma.module.upsert({
    where: { slug: 'en-sik-cikan' },
    update: {},
    create: {
      slug: 'en-sik-cikan',
      name: 'En Sık Çıkan Kelimeler',
      description: 'YDS’de sık çıkan kelimeler',
      sortOrder: 1,
    },
  });

  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'haftalikkelime@gmail.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'haftalikkelime@gmail.com',
      password: hashedPassword,
      isAdmin: true,
      emailVerified: true,
    },
  });

  const sample = [
    { english: 'abandon', turkish: 'terk etmek' },
    { english: 'ability', turkish: 'yetenek' },
    { english: 'abroad', turkish: 'yurtdışı' },
    { english: 'absence', turkish: 'yokluk' },
    { english: 'absolute', turkish: 'kesin' },
  ];

  for (const w of sample) {
    await prisma.word.upsert({
      where: {
        moduleId_english: { moduleId: genel.id, english: w.english },
      },
      update: { turkish: w.turkish },
      create: {
        english: w.english,
        turkish: w.turkish,
        moduleId: genel.id,
        addedBy: 'seed',
      },
    });
  }

  console.log('Seed tamamlandı');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
