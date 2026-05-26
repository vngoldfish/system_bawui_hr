import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createdResponse, errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { hasPermission } from '@/lib/auth-mock';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';

// GET payroll records
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const isEmployee = user.role === 'EMPLOYEE';

    const { searchParams } = new URL(request.url);
    let employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');

    // Force regular employees to only query their own records
    if (isEmployee) {
      employeeId = user.id;
    }

    let where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month) {
      where.month = month;
    }

    // For regular employees, also restrict to months from hire date to now
    if (isEmployee) {
      const dbUser = await prisma.employee.findUnique({
        where: { id: user.id },
        select: { hireDate: true }
      });
      
      if (dbUser) {
        const hireDate = new Date(dbUser.hireDate);
        const hireYear = hireDate.getFullYear();
        const hireMonth = hireDate.getMonth() + 1;
        const hireMonthStr = `${hireYear}-${String(hireMonth).padStart(2, '0')}`;

        const now = new Date();
        const nowYear = now.getFullYear();
        const nowMonth = now.getMonth() + 1;
        const nowMonthStr = `${nowYear}-${String(nowMonth).padStart(2, '0')}`;

        where.month = {
          ...(where.month && typeof where.month === 'object' ? where.month : {}),
          gte: hireMonthStr,
          lte: nowMonthStr,
        };
      }
    }

    const records = await prisma.payrollRecord.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: { month: 'desc' },
    });

    return successResponse(records);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST new payroll record
export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    
    if (!hasPermission('payroll:edit', user as any)) {
      return errorResponse('Forbidden', 403);
    }

    const data = await request.json();

    const record = await prisma.payrollRecord.create({
      data: {
        employeeId: data.employeeId,
        month: data.month,
        baseSalary: parseFloat(data.baseSalary),
        overtimePay: parseFloat(data.overtimePay) || 0,
        bonus: parseFloat(data.bonus) || 0,
        deductions: parseFloat(data.deductions) || 0,
        tax: parseFloat(data.tax) || 0,
        insurance: parseFloat(data.insurance) || 0,
        netSalary: parseFloat(data.netSalary),
        paymentDate: new Date(data.paymentDate),
        status: data.status || 'PENDING',
      },
    });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'PayrollRecord',
      recordId: record.id,
      details: {
        employeeId: record.employeeId,
        month: record.month,
        netSalary: record.netSalary,
        status: record.status,
      },
    });

    return createdResponse(record);
  } catch (error) {
    return handleApiError(error);
  }
}
