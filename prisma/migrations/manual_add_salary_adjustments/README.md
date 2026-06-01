# Manual Migration: Add Salary Adjustments and Payroll Breakdown

This migration adds:
1. `salary_adjustments` table for tracking salary history
2. New columns to `payroll_records` for company/employee contribution breakdown
3. `base_salary_at_hire` column to `employees` table

## Apply this migration:

### Option 1: Using psql directly
```bash
psql -U postgres -d hr_management -f prisma/migrations/manual_add_salary_adjustments/migration.sql
```

### Option 2: Using Prisma (after restart)
```bash
npx prisma migrate deploy
```

## SQL Commands:
See migration.sql for full SQL
