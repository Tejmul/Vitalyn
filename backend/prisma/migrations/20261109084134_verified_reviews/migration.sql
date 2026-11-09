-- AlterTable
ALTER TABLE "Hospital" ALTER COLUMN "rating" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "displayName" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "hiddenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointmentId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_appointmentId_key" ON "Review"("appointmentId");

-- CreateIndex
CREATE INDEX "Review_hospitalId_hidden_createdAt_idx" ON "Review"("hospitalId", "hidden", "createdAt");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
