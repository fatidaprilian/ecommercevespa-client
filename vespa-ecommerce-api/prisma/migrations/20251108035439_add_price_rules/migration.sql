-- CreateTable
CREATE TABLE "public"."PriceAdjustmentRule" (
    "id" TEXT NOT NULL,
    "accurateRuleId" TEXT NOT NULL,
    "name" TEXT,
    "accuratePriceCategoryId" INTEGER,
    "accurateItemCategoryId" TEXT,
    "accurateItemId" TEXT,
    "productId" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceAdjustmentRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceAdjustmentRule_accurateRuleId_key" ON "public"."PriceAdjustmentRule"("accurateRuleId");

-- CreateIndex
CREATE INDEX "PriceAdjustmentRule_accuratePriceCategoryId_idx" ON "public"."PriceAdjustmentRule"("accuratePriceCategoryId");

-- CreateIndex
CREATE INDEX "PriceAdjustmentRule_productId_idx" ON "public"."PriceAdjustmentRule"("productId");

-- CreateIndex
CREATE INDEX "PriceAdjustmentRule_accurateItemId_idx" ON "public"."PriceAdjustmentRule"("accurateItemId");

-- AddForeignKey
ALTER TABLE "public"."PriceAdjustmentRule" ADD CONSTRAINT "PriceAdjustmentRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
