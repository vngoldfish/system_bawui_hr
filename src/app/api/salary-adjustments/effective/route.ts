import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { hasPermission } from '@/lib/auth-mock';
import { getSessionUser } from '@/lib/session';
import { batchGetEffectiveSalaries } from '@/lib/payroll-calculator';

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return errorResponse('month query parameter is required (YYYY-MM)', 400);
    }

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployee = user.role === 'EMPLOYEE' || viewMode === 'employee';

    if (isEmployee) {
      const effective = await batchGetEffectiveSalaries(month, prisma, user.id);
      return successResponse(effective);
    }

    if (!hasPermission('payroll:edit', user as Parameters<typeof hasPermission>[1])) {
      return errorResponse('Forbidden', 403);
    }

    const effectiveSalaries = await batchGetEffectiveSalaries(month, prisma);
    return successResponse(effectiveSalaries);
  } catch (error) {
    return handleApiError(error);
  }
}