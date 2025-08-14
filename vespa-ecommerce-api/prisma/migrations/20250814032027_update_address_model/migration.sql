/*
  Warnings:

  - Added the required column `cityId` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `district` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `districtId` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provinceId` to the `Address` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Address" ADD COLUMN     "cityId" TEXT NOT NULL,
ADD COLUMN     "district" TEXT NOT NULL,
ADD COLUMN     "districtId" TEXT NOT NULL,
ADD COLUMN     "provinceId" TEXT NOT NULL;
