import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, handleApiError } from '@/lib/api-utils';
import { getActiveRateConfig, getRateStatusMessage } from '@/services/payrollRateService';

export async function GET(_request: NextRequest) {
  try {
    const config = await getActiveRateConfig(prisma);
    const status = getRateStatusMessage(config);

    return successResponse({
      isStale: status.isStale,
      fiscalYear: config.fiscalYear,
      lastVerifiedAt: config.lastVerifiedAt,
      lastAiCheckAt: config.lastAiCheckAt,
      daysSinceVerified: status.daysSinceVerified,
      message: status.message,
      aiCheckSummary: config.aiCheckSummary,
    });
  } catch (error) {
    return handleApiError(error);
  }
}