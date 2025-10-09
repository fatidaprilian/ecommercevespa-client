// src/prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // ============================================
  // === SEED ADMIN USER (KODE ANDA YANG SUDAH ADA) ===
  // ============================================
  const saltRounds = 10;
  const password = 'password'; 
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vespa.com' }, 
    update: {}, 
    create: {
      email: 'admin@vespa.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: Role.ADMIN,
      emailVerified: new Date(),
    },
  });

  console.log(`Created admin user: ${adminUser.email}`);
  console.log(`Login with password: ${password}`); 

  // ============================================
  // === SEED CMS PAGES (KODE BARU) ===
  // ============================================
  console.log('Seeding CMS pages...');
  
  // Buat halaman About Us
  await prisma.cmsPage.upsert({
    where: { slug: 'about-us' },
    update: {},
    create: {
      slug: 'about-us',
      title: 'Tentang Kami',
      content: '<p>Tulis konten tentang perusahaan Anda di sini. Jelaskan sejarah, visi, dan misi Anda.</p>',
    },
  });

  // Buat halaman FAQ
  await prisma.cmsPage.upsert({
    where: { slug: 'faq' },
    update: {},
    create: {
      slug: 'faq',
      title: 'Frequently Asked Questions (FAQ)',
      content: '<h2>Pertanyaan Umum</h2><p>Tulis daftar pertanyaan dan jawaban yang sering ditanyakan pelanggan di sini.</p>',
    },
  });

  // Buat halaman Terms & Conditions
  await prisma.cmsPage.upsert({
    where: { slug: 'terms-and-conditions' },
    update: {},
    create: {
      slug: 'terms-and-conditions',
      title: 'Syarat & Ketentuan',
      content: '<p>Jelaskan syarat dan ketentuan penggunaan layanan dan pembelian produk di website Anda.</p>',
    },
  });
  
  console.log('CMS pages seeded successfully.');
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });