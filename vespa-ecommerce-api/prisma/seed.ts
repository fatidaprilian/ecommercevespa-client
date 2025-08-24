// file: vespa-ecommerce-api/prisma/seed.ts

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Inisialisasi Prisma Client
const prisma = new PrismaClient();

// Fungsi utama untuk menjalankan seeding
async function main() {
  console.log('Start seeding ...');

  // 1. Enkripsi password untuk admin
  const saltRounds = 10;
  const password = 'password'; // Ganti dengan password yang lebih aman jika perlu
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // 2. Buat user admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vespa.com' }, // Kunci unik untuk mencari user
    update: {}, // Biarkan kosong jika tidak ada yang perlu di-update
    create: {
      email: 'admin@vespa.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: Role.ADMIN,
      // Tambahkan baris ini untuk memverifikasi email
      emailVerified: new Date(),
    },
  });

  console.log(`Created admin user: ${adminUser.email}`);
  console.log(`Login with password: ${password}`); // Hanya untuk development

  console.log('Seeding finished.');
}

// Menjalankan fungsi main dan menangani error
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Selalu tutup koneksi ke database setelah selesai
    await prisma.$disconnect();
  });