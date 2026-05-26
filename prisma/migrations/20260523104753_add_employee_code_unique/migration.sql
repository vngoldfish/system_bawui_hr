/*
  Warnings:

  - You are about to drop the column `contractType` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `employees` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employeeCode]` on the table `employees` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contractTypeId` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employeeCode` to the `employees` table without a default value. This is not possible if the table is not empty.
  - Added the required column `positionId` to the `employees` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "employees" DROP COLUMN "contractType",
DROP COLUMN "position",
ADD COLUMN     "contractEndDateType" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "contractTypeId" TEXT NOT NULL,
ADD COLUMN     "employeeCode" TEXT NOT NULL,
ADD COLUMN     "positionId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKana" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKana" TEXT NOT NULL,
    "description" TEXT,
    "defaultEndDateType" TEXT NOT NULL DEFAULT 'none',
    "defaultSalaryType" TEXT NOT NULL DEFAULT '月給',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "employees"("employeeCode");

-- CreateIndex
CREATE INDEX "employees_positionId_idx" ON "employees"("positionId");

-- CreateIndex
CREATE INDEX "employees_contractTypeId_idx" ON "employees"("contractTypeId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_contractTypeId_fkey" FOREIGN KEY ("contractTypeId") REFERENCES "contract_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
