import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing banners and reseeding pure graphic HERO banners...');
  await prisma.homePageBanner.deleteMany({});
  
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
  console.log('✅ Reseeded banners successfully with 100% pure graphic HERO banners (no overlay text).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
