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

    // Run updates in a database transaction for data safety
    const updatedEmployees = await prisma.$transaction(
      updates.map(u => {
        const updateData: any = {
          salary: u.salary,
        };
        if (u.hourlyRate !== undefined) updateData.hourlyRate = u.hourlyRate;
        if (u.dailyRate !== undefined) updateData.dailyRate = u.dailyRate;
        if (u.salaryType !== undefined) updateData.salaryType = u.salaryType;

        return prisma.employee.update({
          where: { id: u.id },
          data: updateData,
        });
      })
    );

    // Log the bulk change in audit logs
    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'Employee',
      recordId: 'BULK_SALARY_UPDATE',
      details: {
        updatedCount: updatedEmployees.length,
        employeeIds: updates.map(u => u.id),
      },
    });

    return successResponse({
      count: updatedEmployees.length,
      message: `${updatedEmployees.length}名の給与を一括改定しました。`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
