import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { getSessionUser } from '@/lib/session';
import { syncShiftsToAttendance } from '@/lib/shift-sync';
import { z } from 'zod';

const bodySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  employeeIds: z.array(z.string()).optional(),
  overwriteExisting: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const data = bodySchema.parse(body);
    const result = await syncShiftsToAttendance(prisma, data);

    return successResponse({
      month: data.month,
      ...result,
      message: `作成 ${result.created} / 更新 ${result.updated} / スキップ ${result.skipped}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}