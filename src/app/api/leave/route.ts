import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createdResponse, errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';

// GET leave requests
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const dbUser = await prisma.employee.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployee = dbUser.role === 'EMPLOYEE' || viewMode === 'employee';
    const isDeptManager = dbUser.role === 'DEPARTMENT_MANAGER' && viewMode !== 'employee';

    const where: any = {};

    if (isEmployee) {
      where.employeeId = dbUser.id;
    } else if (isDeptManager) {
      if (employeeId) {
        const targetEmp = await prisma.employee.findUnique({
          where: { id: employeeId },
        });
        if (!targetEmp || targetEmp.departmentId !== dbUser.departmentId) {
          return errorResponse('Forbidden', 403);
        }
        where.employeeId = employeeId;
      } else {
        where.employee = {
          departmentId: dbUser.departmentId,
        };
      }
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    const requests = await prisma.leaveRequest.findMany({
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

// POST new leave request
export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const data = await request.json();

    // Regular employee can only request leave for themselves
    let targetEmployeeId = data.employeeId;
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    if (isEmployeeMode) {
      targetEmployeeId = user.id;
    }

    if (!targetEmployeeId) {
      return errorResponse('従業員IDが指定されていません。', 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { status: true, contractEndDate: true },
    });

    if (employee && employee.status === 'INACTIVE' && employee.contractEndDate) {
      const leaveStartDate = new Date(data.startDate);
      const endDate = new Date(employee.contractEndDate);
      if (leaveStartDate > endDate) {
        return errorResponse('Nhân viên đã nghỉ việc, không thể tạo đơn nghỉ phép.', 400);
      }
    }

    const requestRecord = await prisma.leaveRequest.create({
      data: {
        employeeId: targetEmployeeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        type: data.type,
        reason: data.reason,
        status: 'PENDING',
      },
    });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'LeaveRequest',
      recordId: requestRecord.id,
      details: {
        employeeId: requestRecord.employeeId,
        startDate: requestRecord.startDate,
        endDate: requestRecord.endDate,
        type: requestRecord.type,
        status: requestRecord.status,
      },
    });

    return createdResponse(requestRecord);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT approve/reject leave request
export async function PUT(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const dbUser = await prisma.employee.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return errorResponse('Unauthorized', 401);
    }

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    if (dbUser.role === 'EMPLOYEE' || viewMode === 'employee') {
      return errorResponse('Forbidden', 403);
    }

    const data = await request.json();
    const { id, status } = data; // 'APPROVED' | 'REJECTED'

    if (!id || !['APPROVED', 'REJECTED'].includes(status)) {
      return errorResponse('Invalid parameters', 400);
    }

    // Retrieve the leave request to verify department if DEPARTMENT_MANAGER
    if (dbUser.role === 'DEPARTMENT_MANAGER') {
      const leave = await prisma.leaveRequest.findUnique({
        where: { id },
        include: { employee: true },
      });

      if (!leave) {
        return errorResponse('Leave request not found', 404);
      }

      if (leave.employee.departmentId !== dbUser.departmentId) {
        return errorResponse('Forbidden', 403);
      }

      // Do not allow department managers to approve their own leave request
      if (leave.employeeId === dbUser.id) {
        return errorResponse('Cannot approve your own leave request', 403);
      }
    }

    const requestRecord = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: dbUser.id,
      },
    });

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'LeaveRequest',
      recordId: requestRecord.id,
      details: {
        employeeId: requestRecord.employeeId,
        status: requestRecord.status,
        approvedBy: requestRecord.approvedBy,
      },
    });

    return successResponse(requestRecord);
  } catch (error) {
    return handleApiError(error);
  }
}
