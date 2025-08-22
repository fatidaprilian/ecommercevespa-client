-- AlterEnum
ALTER TYPE "public"."OrderStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "public"."Category" ALTER COLUMN "updatedAt" DROP DEFAULT;
