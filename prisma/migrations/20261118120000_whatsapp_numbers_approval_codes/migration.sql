-- DropIndex
DROP INDEX "WhatsAppConnection_organizationId_key";

-- AlterTable
ALTER TABLE "PaymentReport" ADD COLUMN     "approvalCode" TEXT,
ADD COLUMN     "codeExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TrialFingerprint" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrialFingerprint_kind_value_key" ON "TrialFingerprint"("kind", "value");

-- CreateIndex
CREATE INDEX "WhatsAppConnection_organizationId_idx" ON "WhatsAppConnection"("organizationId");

