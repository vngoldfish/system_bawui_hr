CREATE TABLE IF NOT EXISTS "shift_assignments" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "shiftType" TEXT NOT NULL DEFAULT 'day',
  "startTime" TEXT NOT NULL DEFAULT '09:00',
  "endTime" TEXT NOT NULL DEFAULT '18:00',
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shift_assignments_employeeId_date_key"
  ON "shift_assignments"("employeeId", "date");
CREATE INDEX IF NOT EXISTS "shift_assignments_employeeId_idx"
  ON "shift_assignments"("employeeId");
CREATE INDEX IF NOT EXISTS "shift_assignments_date_idx"
  ON "shift_assignments"("date");

DO $$ BEGIN
  ALTER TABLE "shift_assignments"
    ADD CONSTRAINT "shift_assignments_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;