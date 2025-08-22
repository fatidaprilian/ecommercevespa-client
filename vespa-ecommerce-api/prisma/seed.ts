// file: vespa-ecommerce-api/prisma/seed.ts

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Inisialisasi Prisma Client
const prisma = new PrismaClient();

// Fungsi utama untuk menjalankan seeding
async function main() {
  console.log('Start seeding ...');

  // 1. Enkripsi password untuk admin
  //    Penting: Jangan pernah menyimpan password sebagai plain text!
  const saltRounds = 10;
  const password = 'password'; // Ganti dengan password yang lebih aman jika perlu
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // 2. Buat user admin
  //    Menggunakan `upsert` untuk menghindari duplikasi jika script dijalankan berkali-kali.
  //    Jika user dengan email ini sudah ada, data akan di-update. Jika tidak, akan dibuat.
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' }, // Kunci unik untuk mencari user
    update: {}, // Biarkan kosong jika tidak ada yang perlu di-update
    create: {
      email: 'admin@example.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: Role.ADMIN, // Menggunakan enum `Role` dari schema
    },
  });

  console.log(`Created admin user: ${adminUser.email}`);
  console.log(`Login with password: ${password}`); // Hanya untuk development

  // Anda bisa menambahkan data lain di sini, contoh: Kategori, Brand, dll.

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