const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
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
  console.log('Seeding database with user:', { username: 'semihsacli', password: 'Mayıs2025***' });
  
  const password = 'Mayıs2025***';
  const hashedPassword = hashPassword(password);

  // Kullanıcıyı oluştur veya güncelle
  const user = await prisma.user.upsert({
    where: { username: 'semihsacli' },
    update: {},
    create: {
      username: 'semihsacli',
      password: hashedPassword,
    },
  });

  console.log('Created user:', user);

  // Kelimeleri ekle
  for (const word of words) {
    const createdWord = await prisma.word.create({
      data: word,
    });

    // Her kelime için test oluştur
    const otherWords = words.filter(w => w.english !== word.english);
    const randomOptions = otherWords
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.turkish);
    
    const options = [...randomOptions, word.turkish]
      .sort(() => Math.random() - 0.5);

    await prisma.test.create({
      data: {
        question: `"${word.english}" kelimesinin Türkçe karşılığı nedir?`,
        options: JSON.stringify(options),
        answer: word.turkish,
        wordId: createdWord.id,
      },
    });
  }

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 