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

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    let where: any = {};

    if (user.role === 'EMPLOYEE') {
      where.employeeId = user.id;
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
    if (user.role === 'EMPLOYEE') {
      targetEmployeeId = user.id;
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

    if (user.role === 'EMPLOYEE') {
      return errorResponse('Forbidden', 403);
    }

    const data = await request.json();
    const { id, status } = data; // 'APPROVED' | 'REJECTED'

    if (!id || !['APPROVED', 'REJECTED'].includes(status)) {
      return errorResponse('Invalid parameters', 400);
    }

    const requestRecord = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: user.id,
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
