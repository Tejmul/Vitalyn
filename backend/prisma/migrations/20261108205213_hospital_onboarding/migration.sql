-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "registrationNo" TEXT;

-- CreateTable
CREATE TABLE "HospitalApplication" (
    "id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "hospitalName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "specialties" TEXT[],
    "beds" INTEGER,
    "emergency24x7" BOOLEAN NOT NULL DEFAULT false,
    "registrationNo" TEXT NOT NULL,
    "hfrId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "hospitalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HospitalApplication_hospitalId_key" ON "HospitalApplication"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalApplication_status_idx" ON "HospitalApplication"("status");

-- CreateIndex
CREATE INDEX "HospitalApplication_contactEmail_idx" ON "HospitalApplication"("contactEmail");
