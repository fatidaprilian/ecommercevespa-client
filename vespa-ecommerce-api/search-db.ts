import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const banners = await prisma.homePageBanner.findMany();
    console.log("Banners:", JSON.stringify(banners, null, 2));

    const cmsPages = await prisma.cmsPage.findMany();
    console.log("CMS Pages:", JSON.stringify(cmsPages, null, 2));

    const appSettings = await prisma.appSettings.findMany();
    console.log("App Settings:", JSON.stringify(appSettings, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
