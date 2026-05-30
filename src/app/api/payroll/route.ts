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

    // Verify operator role in database
    const dbOperator = await prisma.employee.findUnique({
      where: { id: user.id }
    });
    if (!dbOperator || (dbOperator.role !== 'SUPER_ADMIN' && dbOperator.role !== 'HR_MANAGER')) {
      return errorResponse('Forbidden: Insufficient privileges', 403);
    }

    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Perform validation checks for all entries
    for (const data of recordsData) {
      if (!data.month || !/^\d{4}-\d{2}$/.test(data.month)) {
        return errorResponse('Invalid month format. Expected YYYY-MM', 400);
      }
      const [year, monthVal] = data.month.split('-').map(Number);
      const recordDate = new Date(year, monthVal - 1, 1);
      if (recordDate > currentMonthStart) {
        return errorResponse('Cannot generate payroll records for future months', 400);
      }

      const baseSalary = parseFloat(data.baseSalary) || 0;
      const overtimePay = parseFloat(data.overtimePay) || 0;
      const allowances = parseFloat(data.allowances || data.bonus) || 0;
      const deductions = parseFloat(data.deductions) || 0;
      const tax = parseFloat(data.tax) || 0;
      const insurance = parseFloat(data.insurance) || 0;

      if (baseSalary < 0 || overtimePay < 0 || allowances < 0 || deductions < 0 || tax < 0 || insurance < 0) {
        return errorResponse('Payroll values cannot be negative', 400);
      }
    }

    const results = await prisma.$transaction(
      recordsData.map((data: any) => {
        const baseSalary = parseFloat(data.baseSalary) || 0;
        const overtimePay = parseFloat(data.overtimePay) || 0;
        const allowances = parseFloat(data.allowances || data.bonus) || 0;
        const deductions = parseFloat(data.deductions) || 0;
        const tax = parseFloat(data.tax) || 0;
        const insurance = parseFloat(data.insurance) || 0;
        const calculatedNet = baseSalary + overtimePay + allowances - (deductions + tax + insurance);

        return prisma.payrollRecord.upsert({
          where: {
            employeeId_month: {
              employeeId: data.employeeId,
              month: data.month,
            },
          },
          update: {
            baseSalary,
            overtimePay,
            bonus: allowances,
            deductions,
            tax,
            insurance,
            netSalary: calculatedNet,
            paymentDate: new Date(data.paymentDate || `${data.month}-25`),
            status: data.status || 'PENDING',
          },
          create: {
            employeeId: data.employeeId,
            month: data.month,
            baseSalary,
            overtimePay,
            bonus: allowances,
            deductions,
            tax,
            insurance,
            netSalary: calculatedNet,
            paymentDate: new Date(data.paymentDate || `${data.month}-25`),
            status: data.status || 'PENDING',
          },
        });
      })
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

// PUT update payroll record(s) - Approve, Pay, Edit details
export async function PUT(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    if (viewMode === 'employee' || !hasPermission('payroll:edit', user as any)) {
      return errorResponse('Forbidden', 403);
    }

    // Verify operator role in database
    const dbOperator = await prisma.employee.findUnique({
      where: { id: user.id }
    });
    if (!dbOperator || (dbOperator.role !== 'SUPER_ADMIN' && dbOperator.role !== 'HR_MANAGER')) {
      return errorResponse('Forbidden: Insufficient privileges', 403);
    }

    const body = await request.json();

    // Case 1: Batch status update (Approve All or Pay All)
    if (body.ids && Array.isArray(body.ids)) {
      const { ids, status, paymentDate } = body;
      
      if (!status || !['APPROVED', 'PAID', 'CANCELLED', 'PENDING', 'CALCULATED'].includes(status)) {
        return errorResponse('Invalid status value', 400);
      }

      const updateData: any = { status };
      if (paymentDate) {
        updateData.paymentDate = new Date(paymentDate);
      } else if (status === 'PAID') {
        updateData.paymentDate = new Date(); // default current date for payout
      }

      const updated = await prisma.payrollRecord.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      });

      logDatabaseChange({
        request,
        action: 'UPDATE',
        model: 'PayrollRecord',
        recordId: 'BATCH',
        details: {
          count: ids.length,
          status,
        },
      });

      return successResponse({ count: updated.count });
    }

    // Case 2: Single record details update (including editing values)
    if (!body.id) {
      return errorResponse('Record ID is required', 400);
    }

    const existing = await prisma.payrollRecord.findUnique({
      where: { id: body.id }
    });
    if (!existing) {
      return errorResponse('Payroll record not found', 404);
    }

    const baseSalary = body.baseSalary !== undefined ? parseFloat(body.baseSalary) : existing.baseSalary;
    const overtimePay = body.overtimePay !== undefined ? parseFloat(body.overtimePay) : existing.overtimePay;
    const allowances = body.allowances !== undefined ? parseFloat(body.allowances) : (body.bonus !== undefined ? parseFloat(body.bonus) : existing.bonus);
    const deductions = body.deductions !== undefined ? parseFloat(body.deductions) : existing.deductions;
    const tax = body.tax !== undefined ? parseFloat(body.tax) : existing.tax;
    const insurance = body.insurance !== undefined ? parseFloat(body.insurance) : existing.insurance;
    const status = body.status || existing.status;
    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : existing.paymentDate;

    if (baseSalary < 0 || overtimePay < 0 || allowances < 0 || deductions < 0 || tax < 0 || insurance < 0) {
      return errorResponse('Payroll values cannot be negative', 400);
    }

    // Mathematical net salary validation overrides client inputs
    const calculatedNet = baseSalary + overtimePay + allowances - (deductions + tax + insurance);

    const updatedRecord = await prisma.payrollRecord.update({
      where: { id: body.id },
      data: {
        baseSalary,
        overtimePay,
        bonus: allowances,
        deductions,
        tax,
        insurance,
        netSalary: calculatedNet,
        status,
        paymentDate,
      },
    });

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'PayrollRecord',
      recordId: updatedRecord.id,
      details: {
        employeeId: updatedRecord.employeeId,
        month: updatedRecord.month,
        netSalary: updatedRecord.netSalary,
        status: updatedRecord.status,
      },
    });

    return successResponse(updatedRecord);
  } catch (error) {
    return handleApiError(error);
  }
}
