/*
  Warnings:

  - You are about to drop the column `creatorAt` on the `Space` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Space" DROP COLUMN "creatorAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
