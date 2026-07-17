-- AlterTable
ALTER TABLE "public"."HomePageBanner" ADD COLUMN "brandId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."HomePageBanner" ADD CONSTRAINT "HomePageBanner_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
