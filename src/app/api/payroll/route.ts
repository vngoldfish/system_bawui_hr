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
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployee = user.role === 'EMPLOYEE' || viewMode === 'employee';

    const { searchParams } = new URL(request.url);
    let employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');

    // Force regular employees to only query their own records
    if (isEmployee) {
      employeeId = user.id;
    }

    const where: any = {};

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

// POST new payroll record(s)
export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    if (viewMode === 'employee' || !hasPermission('payroll:edit', user as any)) {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const isArray = Array.isArray(body);
    const recordsData = isArray ? body : [body];

    const results = await prisma.$transaction(
      recordsData.map((data: any) =>
        prisma.payrollRecord.upsert({
          where: {
            employeeId_month: {
              employeeId: data.employeeId,
              month: data.month,
            },
          },
          update: {
            baseSalary: parseFloat(data.baseSalary),
            overtimePay: parseFloat(data.overtimePay) || 0,
            bonus: parseFloat(data.allowances || data.bonus) || 0, // allowances map to bonus
            deductions: parseFloat(data.deductions) || 0,
            tax: parseFloat(data.tax) || 0,
            insurance: parseFloat(data.insurance) || 0,
            netSalary: parseFloat(data.netSalary),
            paymentDate: new Date(data.paymentDate || `${data.month}-25`),
            status: data.status || 'PENDING',
          },
          create: {
            employeeId: data.employeeId,
            month: data.month,
            baseSalary: parseFloat(data.baseSalary),
            overtimePay: parseFloat(data.overtimePay) || 0,
            bonus: parseFloat(data.allowances || data.bonus) || 0, // allowances map to bonus
            deductions: parseFloat(data.deductions) || 0,
            tax: parseFloat(data.tax) || 0,
            insurance: parseFloat(data.insurance) || 0,
            netSalary: parseFloat(data.netSalary),
            paymentDate: new Date(data.paymentDate || `${data.month}-25`),
            status: data.status || 'PENDING',
          },
        })
      )
    );

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'PayrollRecord',
      recordId: isArray ? 'BATCH' : results[0].id,
      details: {
        count: results.length,
        month: recordsData[0]?.month,
      },
    });

    return createdResponse(isArray ? results : results[0]);
  } catch (error) {
    return handleApiError(error);
  }
}
