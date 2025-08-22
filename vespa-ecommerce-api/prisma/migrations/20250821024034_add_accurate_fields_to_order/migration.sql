-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "accurateSalesInvoiceId" INTEGER,
ADD COLUMN     "accurateSalesInvoiceNumber" TEXT,
ADD COLUMN     "accurateSalesReceiptId" INTEGER;
