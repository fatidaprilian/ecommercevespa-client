import { PrismaClient, Role, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSampleActivities() {
  console.log('Seeding sample activities for Admin Dashboard...');

  const sampleUser = await prisma.user.upsert({
    where: { email: 'budi.santoso@example.com' },
    update: {},
    create: {
      email: 'budi.santoso@example.com',
      name: 'Budi Santoso',
      password: 'SamplePassword123!',
      role: Role.MEMBER,
      emailVerified: new Date(),
    },
  });

  const sampleUser2 = await prisma.user.upsert({
    where: { email: 'siti.rahma@example.com' },
    update: {},
    create: {
      email: 'siti.rahma@example.com',
      name: 'Siti Rahmawati',
      password: 'SamplePassword123!',
      role: Role.MEMBER,
      emailVerified: new Date(),
    },
  });

  const syncCount = await prisma.erpSyncLog.count();
  if (syncCount === 0) {
    await prisma.erpSyncLog.createMany({
      data: [
        {
          syncType: 'ITEM_STOCK',
          status: 'SUCCESS',
          message: 'Sinkronisasi 45 stok produk Vespa Matic berhasil',
          runAt: new Date(Date.now() - 1000 * 60 * 15),
        },
        {
          syncType: 'PRICE_LIST',
          status: 'SUCCESS',
          message: 'Pembaruan daftar harga promo bulan ini selesai',
          runAt: new Date(Date.now() - 1000 * 60 * 180),
        },
      ],
    });
  }

  const orderCount = await prisma.order.count();
  if (orderCount === 0) {
    await prisma.order.create({
      data: {
        userId: sampleUser.id,
        totalAmount: 450000,
        status: OrderStatus.PAID,
        shippingAddress: JSON.stringify({
          recipientName: 'Budi Santoso',
          phoneNumber: '081234567890',
          fullAddress: 'Jl. Raya Bogor No. 45',
          postalCode: '16918',
        }),
        courier: 'JNE',
        shippingCost: 25000,
      },
    });

    await prisma.order.create({
      data: {
        userId: sampleUser2.id,
        totalAmount: 1250000,
        status: OrderStatus.PROCESSING,
        shippingAddress: JSON.stringify({
          recipientName: 'Siti Rahmawati',
          phoneNumber: '089876543210',
          fullAddress: 'Jl. Margonda No. 12',
          postalCode: '16424',
        }),
        courier: 'J&T',
        shippingCost: 30000,
      },
    });
  }

  console.log('✅ Sample activities ready.');
}

export async function restoreSampleBanners() {
  console.log('Restoring sample banners for dev testing...');
  const existingCount = await prisma.homePageBanner.count();
  if (existingCount === 0) {
    await prisma.homePageBanner.createMany({
      data: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=2400&auto=format&fit=crop',
          linkUrl: '/products',
          type: 'HERO',
          isActive: true,
        },
        {
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
    console.log('✅ Restored 6 sample banners.');
  }
}

export async function clearAllBanners() {
  const result = await prisma.homePageBanner.deleteMany({});
  console.log(`✅ Deleted ${result.count} banner records.`);
}

async function main() {
  const action = process.argv[2] || 'activities';
  if (action === 'clear-banners') {
    await clearAllBanners();
  } else if (action === 'reseed-banners') {
    await restoreSampleBanners();
  } else {
    await seedSampleActivities();
    await restoreSampleBanners();
  }
}

if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
