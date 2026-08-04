import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding additional Vespa products...');

  // Get default category or create 'Aksesoris & Suku Cadang'
  let category = await prisma.category.findFirst({ where: { name: 'Suku Cadang' } });
  if (!category) {
    category = await prisma.category.create({ data: { name: 'Suku Cadang' } });
  }

  // Get brands for assignment
  const polini = await prisma.brand.findFirst({ where: { name: 'Polini' } });
  const malossi = await prisma.brand.findFirst({ where: { name: 'Malossi' } });
  const zelioni = await prisma.brand.findFirst({ where: { name: 'Zelioni' } });

  const additionalProducts = [
    {
      sku: 'VSP-013',
      name: 'Exhaust Akrapovic Black Edition Vespa GTS 300',
      price: 12500000,
      stock: 3,
      isFeatured: true,
      isSecondaryFeatured: false,
      brandId: malossi?.id,
      imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop',
    },
    {
      sku: 'VSP-014',
      name: 'Master Rem Brembo RCS 15 Corsa Corta Original',
      price: 4800000,
      stock: 6,
      isFeatured: true,
      isSecondaryFeatured: false,
      brandId: zelioni?.id,
      imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop',
    },
    {
      sku: 'VSP-015',
      name: 'Spion Zelioni Round Billet CNC Short Black',
      price: 1950000,
      stock: 15,
      isFeatured: false,
      isSecondaryFeatured: true,
      brandId: zelioni?.id,
      imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop',
    },
    {
      sku: 'VSP-016',
      name: 'Variator Kit Malossi Multivar 2000 Vespa Sprint 150 3V i-Get',
      price: 2650000,
      stock: 10,
      isFeatured: false,
      isSecondaryFeatured: true,
      brandId: malossi?.id,
      imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop',
    },
    {
      sku: 'VSP-017',
      name: 'Lampu Belakang HD-Corse LED Smoked Vespa Sprint / Primavera',
      price: 1450000,
      stock: 12,
      isFeatured: false,
      isSecondaryFeatured: true,
      brandId: polini?.id,
      imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop',
    },
    {
      sku: 'VSP-018',
      name: 'Windscreen Isotta Low Clear Vespa Primavera 150',
      price: 1750000,
      stock: 7,
      isFeatured: false,
      isSecondaryFeatured: true,
      brandId: zelioni?.id,
      imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop',
    },
    {
      sku: 'VSP-019',
      name: 'Handfat Rizoma Sport Billet Aluminium Universal Black',
      price: 890000,
      stock: 20,
      isFeatured: false,
      isSecondaryFeatured: false,
      brandId: polini?.id,
      imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop',
    },
    {
      sku: 'VSP-020',
      name: 'Shockbreaker Zelioni Front & Rear Set Full Adjustable Vespa Sprint',
      price: 8900000,
      stock: 4,
      isFeatured: true,
      isSecondaryFeatured: false,
      brandId: zelioni?.id,
      imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop',
    },
  ];

  let count = 0;
  for (const item of additionalProducts) {
    const existing = await prisma.product.findUnique({ where: { sku: item.sku } });
    if (!existing) {
      await prisma.product.create({
        data: {
          sku: item.sku,
          name: item.name,
          price: item.price,
          stock: item.stock,
          isFeatured: item.isFeatured,
          isSecondaryFeatured: item.isSecondaryFeatured,
          categoryId: category.id,
          brandId: item.brandId ?? undefined,
          images: {
            create: [{ url: item.imageUrl }],
          },
        },
      });
      count++;
    }
  }

  console.log(`Successfully seeded ${count} new products into database.`);
}

main()
  .catch((e) => {
    console.error('Error seeding products:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
