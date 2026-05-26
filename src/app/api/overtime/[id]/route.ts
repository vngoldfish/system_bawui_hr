import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, errorResponse, successResponse } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';

// PUT approve/reject overtime request
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // Reject employees since only supervisor/admin can approve/reject
    if (user.role === 'EMPLOYEE') {
      return errorResponse('Forbidden', 403);
    }

    const { id } = await params;
    const data = await request.json();

    const existing = await prisma.overtimeRequest.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('残業申請が見つかりません', 404);
    }

    const requestRecord = await prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: data.status,
        approvedBy: user.id,
      },
      include: { employee: true, approver: true },
    });

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'OvertimeRequest',
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
