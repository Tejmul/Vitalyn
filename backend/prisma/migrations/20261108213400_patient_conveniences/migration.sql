-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "SavedHospital" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,

    CONSTRAINT "SavedHospital_pkey" PRIMARY KEY ("userId","hospitalId")
);

-- AddForeignKey
ALTER TABLE "SavedHospital" ADD CONSTRAINT "SavedHospital_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedHospital" ADD CONSTRAINT "SavedHospital_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
