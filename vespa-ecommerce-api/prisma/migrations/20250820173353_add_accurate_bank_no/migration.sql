-- AlterTable
ALTER TABLE "public"."ManualPaymentMethod" ADD COLUMN     "accurateBankNo" TEXT;

-- AlterTable
ALTER TABLE "public"."PaymentMethodMapping" ADD COLUMN     "accurateBankNo" TEXT;
