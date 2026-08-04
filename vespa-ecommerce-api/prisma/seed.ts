// src/prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding (Admin account only)...');

  // ============================================
  // === SEED ADMIN USER ===
  // ============================================
  const saltRounds = 10;
  const password = process.env.ADMIN_SEED_PASSWORD; 
  if (!password) {
    throw new Error('ADMIN_SEED_PASSWORD wajib diisi di .env untuk menjalankan seed.');
  }
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: 'Jakartascootershop@gmail.com' }, 
    update: {}, 
    create: {
      email: 'Jakartascootershop@gmail.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: Role.ADMIN,
      emailVerified: new Date(),
    },
  });

  console.log(`Created/verified admin user: ${adminUser.email}`);
  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
