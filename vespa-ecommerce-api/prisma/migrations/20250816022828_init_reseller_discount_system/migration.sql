/*
  Warnings:

  - You are about to drop the column `defaultDiscountPercentage` on the `ResellerTier` table. All the data in the column will be lost.
  - You are about to drop the column `minSpending` on the `ResellerTier` table. All the data in the column will be lost.
  - You are about to drop the `TierCategoryDiscount` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."TierCategoryDiscount" DROP CONSTRAINT "TierCategoryDiscount_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TierCategoryDiscount" DROP CONSTRAINT "TierCategoryDiscount_resellerTierId_fkey";

-- AlterTable
ALTER TABLE "public"."ResellerTier" DROP COLUMN "defaultDiscountPercentage",
DROP COLUMN "minSpending",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "defaultDiscountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "public"."TierCategoryDiscount";

-- CreateTable
CREATE TABLE "public"."UserProductDiscount" (
    "id" TEXT NOT NULL,
    "discountPercentage" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "UserProductDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserCategoryDiscount" (
    "id" TEXT NOT NULL,
    "discountPercentage" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "UserCategoryDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProductDiscount_userId_productId_key" ON "public"."UserProductDiscount"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCategoryDiscount_userId_categoryId_key" ON "public"."UserCategoryDiscount"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "public"."UserProductDiscount" ADD CONSTRAINT "UserProductDiscount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProductDiscount" ADD CONSTRAINT "UserProductDiscount_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCategoryDiscount" ADD CONSTRAINT "UserCategoryDiscount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCategoryDiscount" ADD CONSTRAINT "UserCategoryDiscount_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
