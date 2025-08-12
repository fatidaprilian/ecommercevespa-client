/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."payments" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "paymentUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_externalId_key" ON "public"."payments"("externalId");
