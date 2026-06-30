ALTER TABLE "contract_types" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE "contract_types" ADD COLUMN IF NOT EXISTS "payrollMode" TEXT NOT NULL DEFAULT 'FULL';
ALTER TABLE "contract_types" ADD COLUMN IF NOT EXISTS "overtimeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.25;
ALTER TABLE "contract_types" ADD COLUMN IF NOT EXISTS "socialInsuranceDefault" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "contract_types" ADD COLUMN IF NOT EXISTS "employmentInsuranceDefault" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "contract_types" ADD COLUMN IF NOT EXISTS "workersCompDefault" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "contract_types" ADD COLUMN IF NOT EXISTS "maxWeeklyHours" DOUBLE PRECISION;
ALTER TABLE "contract_types" ADD COLUMN IF NOT EXISTS "contractTemplateNotes" TEXT NOT NULL DEFAULT '';

INSERT INTO "contract_types" (
  "id", "name", "nameKana", "description",
  "defaultEndDateType", "defaultSalaryType", "defaultWorkDays",
  "defaultStandardHoursPerDay", "defaultCheckIn", "defaultCheckOut",
  "defaultBreakStart", "defaultBreakEnd", "defaultHolidayWorkCountsAsOvertime",
  "category", "payrollMode", "overtimeMultiplier",
  "socialInsuranceDefault", "employmentInsuranceDefault", "workersCompDefault",
  "contractTemplateNotes", "isActive", "createdAt", "updatedAt"
)
SELECT
  'ct_hakken_dispatch_001',
  '派遣社員',
  'ハケンシャイン',
  '派遣スタッフ — 勤務時間レポートのみ',
  'fixed', '時給', '[1,2,3,4,5]'::jsonb,
  8, '09:00', '18:00', '12:00', '13:00', true,
  'HAKKEN', 'HOURS_ONLY', 1.25,
  false, false, true,
  '派遣契約に基づく就業。社会保険・給与は派遣元の管轄。',
  true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "contract_types" WHERE "name" = '派遣社員');