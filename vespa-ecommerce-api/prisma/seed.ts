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

  console.log(`Created admin user: ${adminUser.email}`);
  console.log(`Admin user created/updated successfully.`);

  // ============================================
  // === SEED HOMEPAGE BANNERS (SAFE SEEDING) ===
  // ============================================
  console.log('Checking homepage banners...');
  const bannerCount = await prisma.homePageBanner.count();
  if (bannerCount === 0) {
    console.log('Seeding initial homepage banners...');
    await prisma.homePageBanner.createMany({
      data: [
        {
          title: 'Premium Italian Parts for Classic Vespa',
          subtitle: 'Imported directly from Italy with guaranteed authenticity',
          imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=2400&auto=format&fit=crop',
          linkUrl: '/products',
          type: 'HERO',
          isActive: true,
        },
        {
          title: 'New Arrivals',
          subtitle: 'Check out the latest spare parts',
          imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1200&auto=format&fit=crop',
          linkUrl: '/products',
          type: 'HERO',
          isActive: true,
        },
        {
          title: 'Koleksi Sparepart',
          subtitle: 'Temukan suku cadang original',
          imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000&auto=format&fit=crop',
          linkUrl: '/products',
          type: 'TOP_LEFT',
          isActive: true,
          buttonText: 'Lihat Semua',
          textColor: '#FFFFFF',
          buttonColor: '#000000',
        },
        {
          title: 'Merek Italia Premium',
          subtitle: 'Langsung dari pabrik Italia',
          imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000&auto=format&fit=crop',
          linkUrl: '/brands',
          type: 'TOP_RIGHT',
          isActive: true,
          buttonText: 'Jelajahi',
          textColor: '#FFFFFF',
          buttonColor: '#dc2626',
        },
        {
          title: 'Special Offer',
          imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1800&auto=format&fit=crop',
          linkUrl: '/products',
          type: 'MIDDLE',
          isActive: true,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1200&auto=format&fit=crop',
          type: 'BOTTOM',
          isActive: true,
          textColor: '#1f2937',
          buttonColor: '#1f2937',
        },
      ],
    });
    console.log('Created All Banners (HERO x2, TOP_LEFT, TOP_RIGHT, MIDDLE, BOTTOM)');
  } else {
    console.log(`Banners already exist (${bannerCount} items). Skipping banner seed.`);
  }

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
  // ============================================
  // === SEED BRANDS (SAFE SEEDING) ===
  // ============================================
  console.log('Checking brands...');
  const brandCount = await prisma.brand.count();
  if (brandCount === 0) {
    console.log('Seeding brands...');
    const brandsData = [
      { name: 'Polini', logoUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=400&auto=format&fit=crop' },
      { name: 'Malossi', logoUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=400&auto=format&fit=crop' },
      { name: 'SIP Scootershop', logoUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=400&auto=format&fit=crop' },
      { name: 'Zelioni', logoUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=400&auto=format&fit=crop' },
      { name: 'BGM PRO', logoUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=400&auto=format&fit=crop' },
      { name: 'Pinasco', logoUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=400&auto=format&fit=crop' },
    ];
    for (const b of brandsData) {
      await prisma.brand.upsert({
        where: { name: b.name },
        update: {},
        create: b,
      });
    }
    console.log('Seeded 6 brands successfully.');
  } else {
    console.log(`Brands already exist (${brandCount} items). Skipping brand seed.`);
  }

  // ============================================
  // === SEED DUMMY PRODUCTS (SAFE SEEDING) ===
  // ============================================
  console.log('Checking products...');
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    console.log('Seeding dummy products...');
    const catSpares = await prisma.category.upsert({
      where: { name: 'Suku Cadang' },
      update: {},
      create: { name: 'Suku Cadang' },
    });

    const dummyProductsData = [
      { sku: 'VSP-001', name: 'Knalpot Polini Evolution Vespa PX', price: 2500000, stock: 15, isFeatured: true, isSecondaryFeatured: false },
      { sku: 'VSP-002', name: 'Boring Malossi 166cc Vespa Super', price: 3200000, stock: 8, isFeatured: true, isSecondaryFeatured: false },
      { sku: 'VSP-003', name: 'Karburator Dellorto SI 24.24E', price: 1100000, stock: 20, isFeatured: true, isSecondaryFeatured: false },
      { sku: 'VSP-004', name: 'Velg Tubeless SIP 2.50-10 Black', price: 950000, stock: 12, isFeatured: true, isSecondaryFeatured: false },
      { sku: 'VSP-005', name: 'Shockbreaker BGM PRO Front Vespa', price: 1850000, stock: 5, isFeatured: true, isSecondaryFeatured: false },
      { sku: 'VSP-006', name: 'Kopling Malossi Power Clutch PX', price: 1450000, stock: 10, isFeatured: false, isSecondaryFeatured: true },
      { sku: 'VSP-007', name: 'Lampu Depan Bosatta Vespa Sprint', price: 650000, stock: 18, isFeatured: false, isSecondaryFeatured: true },
      { sku: 'VSP-008', name: 'Speedometer SIP Digital Vespa PX', price: 2800000, stock: 4, isFeatured: false, isSecondaryFeatured: true },
      { sku: 'VSP-009', name: 'Handle Rem/Kopling SIP Billet Black', price: 450000, stock: 25, isFeatured: false, isSecondaryFeatured: true },
      { sku: 'VSP-010', name: 'Ban Schwalbe Weatherman 3.50-10', price: 850000, stock: 14, isFeatured: false, isSecondaryFeatured: true },
      { sku: 'VSP-011', name: 'Aki Gel Motobatt Vespa PTS', price: 380000, stock: 30, isFeatured: false, isSecondaryFeatured: false },
      { sku: 'VSP-012', name: 'Oli Samping Motul 710 2T Full Synthetic', price: 220000, stock: 0, isFeatured: false, isSecondaryFeatured: false }, // Out of stock
    ];

    for (const item of dummyProductsData) {
      await prisma.product.create({
        data: {
          ...item,
          categoryId: catSpares.id,
          images: {
            create: [
              { url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=600&auto=format&fit=crop' },
            ],
          },
        },
      });
    }
    console.log('Seeded 12 dummy products successfully (including 1 out-of-stock item).');
  } else {
    console.log(`Products already exist (${productCount} items). Skipping product seed.`);
  }

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
