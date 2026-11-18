-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "webSessionId" TEXT;

-- AlterTable
ALTER TABLE "WhatsAppConversation" ADD COLUMN     "contactPhone" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Booking_webSessionId_idx" ON "Booking"("webSessionId");

