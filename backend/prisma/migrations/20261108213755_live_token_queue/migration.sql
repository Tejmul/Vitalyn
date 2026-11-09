-- AlterEnum
ALTER TYPE "MessageKind" ADD VALUE 'TOKEN_NEAR';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "calledAt" TIMESTAMP(3),
ADD COLUMN     "tokenNearAt" TIMESTAMP(3);
