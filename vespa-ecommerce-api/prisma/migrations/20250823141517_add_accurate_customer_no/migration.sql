/*
  Warnings:

  - A unique constraint covering the columns `[accurateCustomerNo]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "accurateCustomerNo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_accurateCustomerNo_key" ON "public"."User"("accurateCustomerNo");
