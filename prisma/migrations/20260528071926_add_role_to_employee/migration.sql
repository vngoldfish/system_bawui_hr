-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "address" TEXT DEFAULT '',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'ja',
ADD COLUMN     "password" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'EMPLOYEE';

-- CreateTable
CREATE TABLE "employee_contracts" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "contractTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "workDays" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
    "standardHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "defaultCheckIn" TEXT NOT NULL DEFAULT '08:00',
    "defaultCheckOut" TEXT NOT NULL DEFAULT '17:00',
    "defaultBreakStart" TEXT NOT NULL DEFAULT '12:00',
    "defaultBreakEnd" TEXT NOT NULL DEFAULT '13:00',
    "holidayWorkCountsAsOvertime" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NATIONAL',
    "isPaidHoliday" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "targetType" TEXT NOT NULL DEFAULT 'ALL',
    "targetId" TEXT,
    "showSenderName" BOOLEAN NOT NULL DEFAULT true,
    "senderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shitens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKana" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shitens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EmployeeShitens" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "employee_contracts_employeeId_startDate_endDate_idx" ON "employee_contracts"("employeeId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "employee_contracts_contractTypeId_idx" ON "employee_contracts"("contractTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");

-- CreateIndex
CREATE INDEX "holidays_date_idx" ON "holidays"("date");

-- CreateIndex
CREATE INDEX "holidays_isActive_idx" ON "holidays"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_permission_key" ON "role_permissions"("role", "permission");

-- CreateIndex
CREATE INDEX "announcements_targetType_targetId_idx" ON "announcements"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_templates_key_key" ON "reminder_templates"("key");

-- CreateIndex
CREATE UNIQUE INDEX "_EmployeeShitens_AB_unique" ON "_EmployeeShitens"("A", "B");

-- CreateIndex
CREATE INDEX "_EmployeeShitens_B_index" ON "_EmployeeShitens"("B");

-- AddForeignKey
ALTER TABLE "employee_contracts" ADD CONSTRAINT "employee_contracts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_contracts" ADD CONSTRAINT "employee_contracts_contractTypeId_fkey" FOREIGN KEY ("contractTypeId") REFERENCES "contract_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeShitens" ADD CONSTRAINT "_EmployeeShitens_A_fkey" FOREIGN KEY ("A") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeShitens" ADD CONSTRAINT "_EmployeeShitens_B_fkey" FOREIGN KEY ("B") REFERENCES "shitens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
