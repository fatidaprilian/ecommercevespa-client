-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "manualPaymentMethodId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_manualPaymentMethodId_fkey" FOREIGN KEY ("manualPaymentMethodId") REFERENCES "public"."ManualPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
