import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import bcrypt from 'bcryptjs';

/**
 * Kullanım (PowerShell):
 * $env:ADMIN_USERNAME="Veysel"
 * $env:ADMIN_EMAIL="ornek@email.com"
 * $env:ADMIN_PASSWORD="guclu-sifre"
 * npm run create-admin
 */
const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !email || !password) {
    console.error(
      'ADMIN_USERNAME, ADMIN_EMAIL ve ADMIN_PASSWORD ortam değişkenleri zorunlu.'
    );
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      username,
      password: hashedPassword,
      isAdmin: true,
      emailVerified: true,
    },
    create: {
      username,
      email,
      password: hashedPassword,
      isAdmin: true,
      emailVerified: true,
    },
  });

  console.log('Admin hazır:', {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    isAdmin: admin.isAdmin,
  });
}

main()
  .catch((e) => {
    console.error('Hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
