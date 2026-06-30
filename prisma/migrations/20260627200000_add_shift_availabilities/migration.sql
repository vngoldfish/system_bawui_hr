CREATE TABLE IF NOT EXISTS "shift_availabilities" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "targetMonth" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "shiftPreference" TEXT NOT NULL DEFAULT 'any',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "shift_availabilities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shift_availabilities_employeeId_date_key"
  ON "shift_availabilities"("employeeId", "date");
CREATE INDEX IF NOT EXISTS "shift_availabilities_targetMonth_idx"
  ON "shift_availabilities"("targetMonth");
CREATE INDEX IF NOT EXISTS "shift_availabilities_date_idx"
  ON "shift_availabilities"("date");
CREATE INDEX IF NOT EXISTS "shift_availabilities_employeeId_targetMonth_idx"
  ON "shift_availabilities"("employeeId", "targetMonth");

DO $$ BEGIN
  ALTER TABLE "shift_availabilities"
    ADD CONSTRAINT "shift_availabilities_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;