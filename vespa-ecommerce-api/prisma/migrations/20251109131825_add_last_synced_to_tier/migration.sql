-- AlterTable
ALTER TABLE "public"."ProductPriceTier" ADD COLUMN     "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
