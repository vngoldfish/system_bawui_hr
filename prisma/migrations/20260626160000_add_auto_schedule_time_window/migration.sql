-- AlterTable
ALTER TABLE "companies" ADD COLUMN "autoScheduleTimeFrom" TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE "companies" ADD COLUMN "autoScheduleTimeTo" TEXT NOT NULL DEFAULT '22:00';