import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';
import { z } from 'zod';

const bulkSalarySchema = z.array(
  z.object({
    id: z.string(),
    salary: z.number().nonnegative(),
    hourlyRate: z.number().nonnegative().optional(),
    dailyRate: z.number().nonnegative().optional(),
    salaryType: z.enum(['月給', '日給', '時給']).optional(),
  })
);

export async function PUT(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    if (viewMode === 'employee' || (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER')) {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const updates = bulkSalarySchema.parse(body);

    if (updates.length === 0) {
      return successResponse({ count: 0, message: 'No updates provided' });
    }

    const employeeIds = updates.map(u => u.id);
    const existingEmployees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, salary: true, hourlyRate: true, dailyRate: true }
    });

    const existingMap = new Map(existingEmployees.map(e => [e.id, e]));
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Run updates in a database transaction for data safety
    await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        const existing = existingMap.get(u.id);
        if (!existing) continue;

        const salaryChanged = (u.salary !== existing.salary) ||
                              (u.hourlyRate !== undefined && u.hourlyRate !== existing.hourlyRate) ||
                              (u.dailyRate !== undefined && u.dailyRate !== existing.dailyRate);

        if (salaryChanged) {
          const adjustmentData = {
            oldBaseSalary: existing.salary,
            newBaseSalary: u.salary,
            oldHourlyRate: existing.hourlyRate,
            newHourlyRate: u.hourlyRate !== undefined ? u.hourlyRate : existing.hourlyRate,
            oldDailyRate: existing.dailyRate,
            newDailyRate: u.dailyRate !== undefined ? u.dailyRate : existing.dailyRate,
            reason: "一括給与改定による変更 (Changed via bulk salary update)",
            adjustedBy: user.id,
          };
          const existingAdjustment = await tx.salaryAdjustment.findFirst({
            where: { employeeId: u.id, effectiveFrom: currentMonth },
          });
          if (existingAdjustment) {
            await tx.salaryAdjustment.update({
              where: { id: existingAdjustment.id },
              data: { ...adjustmentData, adjustedAt: new Date() },
            });
          } else {
            await tx.salaryAdjustment.create({
              data: { employeeId: u.id, effectiveFrom: currentMonth, ...adjustmentData },
            });
          }
        }

        const updateData: any = {
          salary: u.salary,
        };
        if (u.hourlyRate !== undefined) updateData.hourlyRate = u.hourlyRate;
        if (u.dailyRate !== undefined) updateData.dailyRate = u.dailyRate;
        if (u.salaryType !== undefined) updateData.salaryType = u.salaryType;

        await tx.employee.update({
          where: { id: u.id },
          data: updateData,
        });
      }
    });

    // Log the bulk change in audit logs
    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'Employee',
      recordId: 'BULK_SALARY_UPDATE',
      details: {
        updatedCount: updates.length,
        employeeIds,
      },
    });

    return successResponse({
      count: updates.length,
      message: `${updates.length}名の給与を一括改定しました。`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
