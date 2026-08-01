import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createdResponse, handleApiError, successResponse, errorResponse } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';

// GET overtime requests
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    const where: any = {};

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    if (isEmployeeMode) {
      where.employeeId = user.id;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    const requests = await prisma.overtimeRequest.findMany({
      where,
      include: {
        employee: true,
        approver: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(requests);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST new overtime request
export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const data = await request.json();

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    const targetEmployeeId = isEmployeeMode ? user.id : data.employeeId;

    if (!targetEmployeeId) {
      return errorResponse('従業員IDが指定されていません。', 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { status: true, contractEndDate: true },
    });

    if (employee && employee.status === 'INACTIVE' && employee.contractEndDate) {
      const overtimeDate = new Date(data.date);
      const endDate = new Date(employee.contractEndDate);
      if (overtimeDate > endDate) {
        return errorResponse('Nhân viên đã nghỉ việc, không thể tạo đơn tăng ca.', 400);
      }
    }

    const requestRecord = await prisma.overtimeRequest.create({
      data: {
        employeeId: targetEmployeeId,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
        status: 'PENDING',
      },
    });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'OvertimeRequest',
      recordId: requestRecord.id,
      details: {
        employeeId: requestRecord.employeeId,
        date: requestRecord.date,
        startTime: requestRecord.startTime,
        endTime: requestRecord.endTime,
        status: requestRecord.status,
      },
    });

    return createdResponse(requestRecord);
  } catch (error) {
    return handleApiError(error);
  }
}
