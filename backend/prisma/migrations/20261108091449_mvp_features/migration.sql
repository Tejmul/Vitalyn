-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'OTHER');

-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'EXPIRED';

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_userId_fkey";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "approveBy" TIMESTAMP(3),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "profileId" TEXT,
ADD COLUMN     "walkIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "walkInPhone" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "hfrId" TEXT,
ADD COLUMN     "registrationNo" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentVersion" TEXT;

-- CreateTable
CREATE TABLE "PatientProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" "Gender",
    "relation" TEXT NOT NULL DEFAULT 'Self',
    "abhaNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorLeave" (
    "id" TEXT NOT NULL,
    "date" CHAR(10) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doctorId" TEXT NOT NULL,

    CONSTRAINT "DoctorLeave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentEvent" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from" "AppointmentStatus",
    "to" "AppointmentStatus" NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointmentId" TEXT NOT NULL,

    CONSTRAINT "AppointmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "appointmentId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorLeave_doctorId_date_key" ON "DoctorLeave"("doctorId", "date");

-- CreateIndex
CREATE INDEX "AppointmentEvent_appointmentId_idx" ON "AppointmentEvent"("appointmentId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Appointment_status_approveBy_idx" ON "Appointment"("status", "approveBy");

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorLeave" ADD CONSTRAINT "DoctorLeave_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentEvent" ADD CONSTRAINT "AppointmentEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
