/*
  Warnings:

  - A unique constraint covering the columns `[accurateItemId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "accurateItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_accurateItemId_key" ON "public"."Product"("accurateItemId");
