-- AlterTable
ALTER TABLE "public"."PriceAdjustmentRule" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."ProductPriceTier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "accuratePriceCategoryId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductPriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPriceTier_productId_idx" ON "public"."ProductPriceTier"("productId");

-- CreateIndex
CREATE INDEX "ProductPriceTier_accuratePriceCategoryId_idx" ON "public"."ProductPriceTier"("accuratePriceCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPriceTier_productId_accuratePriceCategoryId_key" ON "public"."ProductPriceTier"("productId", "accuratePriceCategoryId");

-- AddForeignKey
ALTER TABLE "public"."ProductPriceTier" ADD CONSTRAINT "ProductPriceTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
