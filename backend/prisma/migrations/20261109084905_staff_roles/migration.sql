-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('MANAGER', 'RECEPTION');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "staffRole" "StaffRole";

-- Existing hospital desk accounts were set up by the hospital's own applicant: they become managers.
UPDATE "User" SET "staffRole" = 'MANAGER' WHERE "role" = 'HOSPITAL' AND "staffRole" IS NULL;
