-- Manual Migration: Add Salary Adjustments and Payroll Breakdown
-- Created: 2026-05-31
-- Description: Adds salary history tracking and detailed payroll contribution breakdown

-- ============================================
-- 1. Create salary_adjustments table
-- ============================================
CREATE TABLE IF NOT EXISTS "salary_adjustments" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" TEXT NOT NULL,
    "oldBaseSalary" DOUBLE PRECISION NOT NULL,
    "newBaseSalary" DOUBLE PRECISION NOT NULL,
    "oldHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "oldDailyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newDailyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "adjustedBy" TEXT,
    "adjustedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_adjustments_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "salary_adjustments_employeeId_effectiveFrom_idx"
    ON "salary_adjustments"("employeeId", "effectiveFrom");

-- Add foreign key constraint
ALTER TABLE "salary_adjustments"
    ADD CONSTRAINT "salary_adjustments_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- 2. Add new columns to payroll_records
-- ============================================

-- Company contributions (会社負担分)
ALTER TABLE "payroll_records"
    ADD COLUMN IF NOT EXISTS "healthInsuranceCompany" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "payroll_records"
    ADD COLUMN IF NOT EXISTS "pensionCompany" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "payroll_records"
    ADD COLUMN IF NOT EXISTS "employmentInsuranceCompany" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "payroll_records"
    ADD COLUMN IF NOT EXISTS "workersCompCompany" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Employee contributions (従業員負担分) - detailed breakdown
ALTER TABLE "payroll_records"
    ADD COLUMN IF NOT EXISTS "healthInsuranceEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "payroll_records"
    ADD COLUMN IF NOT EXISTS "pensionEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "payroll_records"
    ADD COLUMN IF NOT EXISTS "employmentInsuranceEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Resident tax
ALTER TABLE "payroll_records"
    ADD COLUMN IF NOT EXISTS "residentTax" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Income tax (separate from generic 'tax' field)
ALTER TABLE "payroll_records"
    ADD COLUMN IF NOT EXISTS "incomeTax" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Nursing care insurance (介護保険)
ALTER TABLE "payroll_records"
    ADD COLUMN IF NOT EXISTS "nursingCareInsurance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Total company cost
ALTER TABLE "payroll_records"
    ADD COLUMN IF NOT EXISTS "totalCompanyCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ============================================
-- 3. Add baseSalaryAtHire to employees
-- ============================================
ALTER TABLE "employees"
    ADD COLUMN IF NOT EXISTS "baseSalaryAtHire" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ============================================
-- 4. Add relation (handled by Prisma, no SQL needed)
-- ============================================
-- The salaryAdjustments relation on Employee is handled by Prisma ORM
-- No additional SQL needed for the relation definition

-- ============================================
-- Verification queries
-- ============================================
-- Run these to verify migration success:

-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'payroll_records'
--   AND column_name LIKE '%Company' OR column_name LIKE '%Employee';

-- SELECT COUNT(*) FROM salary_adjustments;
