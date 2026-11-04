-- Pago único de instalación + mensualidad por barbero
ALTER TABLE "Organization" ADD COLUMN "setupPaidAt" TIMESTAMP(3);
ALTER TABLE "PaymentReport" ADD COLUMN "setupInCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PaymentReport" ADD COLUMN "barbers" INTEGER NOT NULL DEFAULT 1;

-- Los negocios que ya pagaron con la tarifa anterior no pagan instalación.
UPDATE "Organization" SET "setupPaidAt" = CURRENT_TIMESTAMP WHERE "subscriptionStatus" = 'active';
