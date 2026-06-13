import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createdResponse, successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { hasPermission } from '@/lib/auth-mock';
import { getSessionUser } from '@/lib/session';
import { logDatabaseChange } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return errorResponse('employeeId query parameter is required', 400);
    }

    const adjustments = await prisma.salaryAdjustment.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });

    return successResponse(adjustments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    if (viewMode === 'employee' || !hasPermission('payroll:edit', user as any)) {
      return errorResponse('Forbidden', 403);
    }

    const dbOperator = await prisma.employee.findUnique({
      where: { id: user.id }
    });
    if (!dbOperator || (dbOperator.role !== 'SUPER_ADMIN' && dbOperator.role !== 'HR_MANAGER')) {
      return errorResponse('Forbidden: Insufficient privileges', 403);
    }

    const body = await request.json();
    const { employeeId, effectiveFrom, newBaseSalary, newHourlyRate, newDailyRate, reason } = body;

    if (!employeeId || !effectiveFrom) {
      return errorResponse('employeeId and effectiveFrom are required', 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });
    if (!employee) {
      return errorResponse('Employee not found', 404);
    }

    const hireDateMonth = employee.hireDate.toISOString().slice(0, 7);
    if (effectiveFrom < hireDateMonth) {
      return errorResponse('effectiveFrom cannot be before employee hire date month', 400);
    }

    const existingAdjustment = await prisma.salaryAdjustment.findFirst({
      where: { employeeId, effectiveFrom },
    });

    let adjustment;
    if (existingAdjustment) {
      adjustment = await prisma.salaryAdjustment.update({
        where: { id: existingAdjustment.id },
        data: {
          newBaseSalary: newBaseSalary !== undefined ? parseFloat(newBaseSalary) : employee.salary,
          newHourlyRate: newHourlyRate !== undefined ? parseFloat(newHourlyRate) : employee.hourlyRate || 0,
          newDailyRate: newDailyRate !== undefined ? parseFloat(newDailyRate) : employee.dailyRate || 0,
          reason: reason || '',
          adjustedBy: user.id,
          adjustedAt: new Date(),
        },
      });
    } else {
      adjustment = await prisma.salaryAdjustment.create({
        data: {
          employeeId,
          effectiveFrom,
          oldBaseSalary: employee.salary,
          newBaseSalary: newBaseSalary !== undefined ? parseFloat(newBaseSalary) : employee.salary,
          newHourlyRate: newHourlyRate !== undefined ? parseFloat(newHourlyRate) : employee.hourlyRate || 0,
          newDailyRate: newDailyRate !== undefined ? parseFloat(newDailyRate) : employee.dailyRate || 0,
          reason: reason || '',
          adjustedBy: user.id,
        }
      });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    if (effectiveFrom <= currentMonth) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: {
          ...(newBaseSalary !== undefined && { salary: parseFloat(newBaseSalary) }),
          ...(newHourlyRate !== undefined && { hourlyRate: parseFloat(newHourlyRate) }),
          ...(newDailyRate !== undefined && { dailyRate: parseFloat(newDailyRate) }),
        }
      });
    }

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'SalaryAdjustment',
      recordId: adjustment.id,
      details: { employeeId, effectiveFrom },
    });

    return createdResponse(adjustment);
  } catch (error) {
    return handleApiError(error);
  }
}
