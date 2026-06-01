-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PayrollStatus" ADD VALUE 'CALCULATED';
ALTER TYPE "PayrollStatus" ADD VALUE 'APPROVED';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "insuranceSalary" DOUBLE PRECISION,
ADD COLUMN     "residenceCardImage" TEXT;

-- AlterTable
ALTER TABLE "payroll_records" ADD COLUMN     "absentDays" DOUBLE PRECISION,
ADD COLUMN     "overtimeHours" DOUBLE PRECISION,
ADD COLUMN     "workDays" DOUBLE PRECISION,
ADD COLUMN     "workHours" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "residence_card_history" ADD COLUMN     "residenceCardImage" TEXT;

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKana" TEXT NOT NULL,
    "representative" TEXT NOT NULL,
    "representativeTitle" TEXT NOT NULL,
    "established" TEXT NOT NULL,
    "capital" TEXT NOT NULL,
    "employees" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fax" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "roundingPolicy" TEXT NOT NULL,
    "salaryCutoffDay" TEXT NOT NULL,
    "payday" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);
