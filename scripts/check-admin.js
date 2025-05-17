const { PrismaClient } = require('@prisma/client');

async function checkAdmin() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { username: 'semihsacli' }
    });
    console.log('Mevcut kullanıcı:', user);
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin(); 