-- AlterTable
ALTER TABLE "public"."ManualPaymentMethod" ADD COLUMN     "accurateBankId" INTEGER;

-- AlterTable
ALTER TABLE "public"."PaymentMethodMapping" ADD COLUMN     "accurateBankId" INTEGER;
