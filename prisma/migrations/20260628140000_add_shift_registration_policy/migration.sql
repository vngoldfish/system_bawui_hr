ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "shiftRegistrationDeadlineDay" INTEGER NOT NULL DEFAULT 25;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "shiftRegistrationPolicyRules" JSONB;