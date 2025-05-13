const { PrismaClient } = require('@prisma/client');
const { createHash } = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const hashed = createHash('sha256').update(password).digest('base64');
  console.log('Creating user with hashed password:', hashed);
  return hashed;
}

async function main() {
  const password = 'Mayıs2025***';
  console.log('Seeding database with user:', {
    username: 'semihsacli',
    password: password
  });

  const hashedPassword = hashPassword(password);
  
  const user = await prisma.user.upsert({
    where: { username: 'semihsacli' },
    update: {},
    create: {
      username: 'semihsacli',
      password: hashedPassword,
    },
  });

  console.log('User created/updated:', user);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 