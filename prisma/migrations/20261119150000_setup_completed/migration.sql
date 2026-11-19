-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "setupCompleted" TEXT[] DEFAULT ARRAY[]::TEXT[];

