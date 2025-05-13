const { PrismaClient } = require('@prisma/client');
const { createHash } = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  return createHash('sha256').update(password).digest('base64');
}

async function main() {
  const hashedPassword = hashPassword('Mayıs2025***');
  
  await prisma.user.upsert({
    where: { username: 'semihsacli' },
    update: {},
    create: {
      username: 'semihsacli',
      password: hashedPassword,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 