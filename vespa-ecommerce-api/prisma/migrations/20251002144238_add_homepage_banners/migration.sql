-- CreateEnum
CREATE TYPE "public"."BannerType" AS ENUM ('HERO', 'MIDDLE');

-- CreateTable
CREATE TABLE "public"."HomePageBanner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "type" "public"."BannerType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePageBanner_pkey" PRIMARY KEY ("id")
);
