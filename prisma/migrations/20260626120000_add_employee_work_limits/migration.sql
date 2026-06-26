-- AlterTable
ALTER TABLE "employees" ADD COLUMN "workLimitVisa28h" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "employees" ADD COLUMN "workLimitIncomeCap80k" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "employees" ADD COLUMN "workLimitWeeklyHours" DOUBLE PRECISION;
ALTER TABLE "employees" ADD COLUMN "workLimitMonthlyIncome" DOUBLE PRECISION;