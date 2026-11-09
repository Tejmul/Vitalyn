-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "promotionId" TEXT;

-- CreateTable
CREATE TABLE "PromotionStat" (
    "date" CHAR(10) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "bookings" INTEGER NOT NULL DEFAULT 0,
    "promotionId" TEXT NOT NULL,

    CONSTRAINT "PromotionStat_pkey" PRIMARY KEY ("promotionId","date")
);

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionStat" ADD CONSTRAINT "PromotionStat_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
