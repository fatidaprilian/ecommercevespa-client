import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

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