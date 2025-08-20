/*
  Warnings:

  - A unique constraint covering the columns `[paymentMethodKey]` on the table `ManualPaymentMethod` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accurateBankName` to the `ManualPaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethodKey` to the `ManualPaymentMethod` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ManualPaymentMethod" ADD COLUMN     "accurateBankName" TEXT NOT NULL,
ADD COLUMN     "paymentMethodKey" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."PaymentMethodMapping" (
    "id" TEXT NOT NULL,
    "paymentMethodKey" TEXT NOT NULL,
    "accurateBankName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodMapping_paymentMethodKey_key" ON "public"."PaymentMethodMapping"("paymentMethodKey");

-- CreateIndex
CREATE UNIQUE INDEX "ManualPaymentMethod_paymentMethodKey_key" ON "public"."ManualPaymentMethod"("paymentMethodKey");
