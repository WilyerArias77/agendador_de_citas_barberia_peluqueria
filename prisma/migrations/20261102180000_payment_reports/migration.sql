-- CreateTable
CREATE TABLE "PaymentReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "payerName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentReport_status_createdAt_idx" ON "PaymentReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentReport_organizationId_idx" ON "PaymentReport"("organizationId");

-- AddForeignKey
ALTER TABLE "PaymentReport" ADD CONSTRAINT "PaymentReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

