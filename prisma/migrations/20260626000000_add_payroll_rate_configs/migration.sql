-- CreateTable
CREATE TABLE "payroll_rate_configs" (
    "id" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "effectiveFrom" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "prefecture" TEXT NOT NULL DEFAULT '東京都',
    "healthInsuranceRate" DOUBLE PRECISION NOT NULL DEFAULT 9.98,
    "nursingCareRate" DOUBLE PRECISION NOT NULL DEFAULT 1.59,
    "pensionRate" DOUBLE PRECISION NOT NULL DEFAULT 18.3,
    "employmentInsuranceEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
    "employmentInsuranceCompany" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "workersCompRate" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "incomeTaxYear" INTEGER NOT NULL DEFAULT 2026,
    "otherRates" JSONB,
    "incomeTaxTable" JSONB,
    "changeLog" JSONB,
    "lastVerifiedAt" TIMESTAMP(3),
    "lastAiCheckAt" TIMESTAMP(3),
    "aiCheckSummary" TEXT,
    "sourceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_rate_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_rate_check_logs" (
    "id" TEXT NOT NULL,
    "configId" TEXT,
    "checkType" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "currentRates" JSONB,
    "suggestedRates" JSONB,
    "differences" JSONB,
    "aiModel" TEXT,
    "aiRawResponse" TEXT,
    "checkedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_rate_check_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_rate_configs_status_idx" ON "payroll_rate_configs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_rate_configs_fiscalYear_status_key" ON "payroll_rate_configs"("fiscalYear", "status");

-- CreateIndex
CREATE INDEX "payroll_rate_check_logs_createdAt_idx" ON "payroll_rate_check_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "payroll_rate_check_logs" ADD CONSTRAINT "payroll_rate_check_logs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "payroll_rate_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;