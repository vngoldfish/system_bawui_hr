import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { getSessionUser } from '@/lib/session';
import { checkRatesWithAi } from '@/services/payrollRateAiService';
import { z } from 'zod';

const checkSchema = z.object({
  fiscalYear: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    let fiscalYear: number | undefined;
    try {
      const body = await request.json();
      const parsed = checkSchema.parse(body);
      fiscalYear = parsed.fiscalYear;
    } catch {
      // empty body OK
    }

    const result = await checkRatesWithAi(prisma, fiscalYear, user.id);

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}