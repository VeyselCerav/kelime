const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function updateAdmin() {
  const prisma = new PrismaClient();
  try {
    const hashedPassword = await bcrypt.hash('Mayıs2025***', 10);
    const admin = await prisma.user.update({
      where: { username: 'semihsacli' },
      data: {
        email: 'haftalikkelime@gmail.com',
        password: hashedPassword,
        emailVerified: new Date(),
        isAdmin: true
      }
    });
    console.log('Yönetici hesabı başarıyla güncellendi:', admin.username);
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdmin(); 