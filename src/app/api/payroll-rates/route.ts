import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { getSessionUser } from '@/lib/session';
import {
  getActiveRateConfig,
  getRateStatusMessage,
  isRateConfigStale,
} from '@/services/payrollRateService';

const updateRateSchema = z.object({
  fiscalYear: z.number().optional(),
  effectiveFrom: z.string().optional(),
  prefecture: z.string().optional(),
  healthInsuranceRate: z.number().optional(),
  nursingCareRate: z.number().optional(),
  pensionRate: z.number().optional(),
  employmentInsuranceEmployee: z.number().optional(),
  employmentInsuranceCompany: z.number().optional(),
  workersCompRate: z.number().optional(),
  incomeTaxYear: z.number().optional(),
  otherRates: z.array(z.unknown()).optional(),
  incomeTaxTable: z.unknown().optional(),
  sourceNotes: z.string().optional(),
  changeEntry: z
    .object({
      itemId: z.string(),
      itemName: z.string(),
      field: z.string(),
      oldValue: z.string(),
      newValue: z.string(),
      reason: z.string(),
      user: z.string().optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    const config = await getActiveRateConfig(prisma);
    const staleInfo = getRateStatusMessage(config);

    const isHr =
      user &&
      (user.role === 'SUPER_ADMIN' || user.role === 'HR_MANAGER');

    if (!isHr) {
      return successResponse({
        healthInsuranceRate: config.healthInsuranceRate,
        nursingCareRate: config.nursingCareRate,
        pensionRate: config.pensionRate,
        employmentInsuranceEmployee: config.employmentInsuranceEmployee,
        employmentInsuranceCompany: config.employmentInsuranceCompany,
        workersCompRate: config.workersCompRate,
        incomeTaxYear: config.incomeTaxYear,
        fiscalYear: config.fiscalYear,
        isStale: staleInfo.isStale,
      });
    }

    return successResponse({
      ...config,
      isStale: staleInfo.isStale,
      daysSinceVerified: staleInfo.daysSinceVerified,
      message: staleInfo.message,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const data = updateRateSchema.parse(body);

    const existing = await getActiveRateConfig(prisma);
    const changeLog = Array.isArray(existing.changeLog) ? [...(existing.changeLog as object[])] : [];

    if (data.changeEntry) {
      changeLog.unshift({
        ...data.changeEntry,
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: data.changeEntry.user ?? user.email ?? 'HR',
      });
    }

    const { changeEntry: _omit, ...updateFields } = data;

    const updateData: Prisma.PayrollRateConfigUpdateInput = {
      lastVerifiedAt: new Date(),
      changeLog: changeLog as Prisma.InputJsonValue,
    };
    if (updateFields.fiscalYear !== undefined) updateData.fiscalYear = updateFields.fiscalYear;
    if (updateFields.effectiveFrom !== undefined) updateData.effectiveFrom = updateFields.effectiveFrom;
    if (updateFields.prefecture !== undefined) updateData.prefecture = updateFields.prefecture;
    if (updateFields.healthInsuranceRate !== undefined) updateData.healthInsuranceRate = updateFields.healthInsuranceRate;
    if (updateFields.nursingCareRate !== undefined) updateData.nursingCareRate = updateFields.nursingCareRate;
    if (updateFields.pensionRate !== undefined) updateData.pensionRate = updateFields.pensionRate;
    if (updateFields.employmentInsuranceEmployee !== undefined) updateData.employmentInsuranceEmployee = updateFields.employmentInsuranceEmployee;
    if (updateFields.employmentInsuranceCompany !== undefined) updateData.employmentInsuranceCompany = updateFields.employmentInsuranceCompany;
    if (updateFields.workersCompRate !== undefined) updateData.workersCompRate = updateFields.workersCompRate;
    if (updateFields.incomeTaxYear !== undefined) updateData.incomeTaxYear = updateFields.incomeTaxYear;
    if (updateFields.otherRates !== undefined) updateData.otherRates = updateFields.otherRates as Prisma.InputJsonValue;
    if (updateFields.incomeTaxTable !== undefined) updateData.incomeTaxTable = updateFields.incomeTaxTable as Prisma.InputJsonValue;
    if (updateFields.sourceNotes !== undefined) updateData.sourceNotes = updateFields.sourceNotes;

    const updated = await prisma.payrollRateConfig.update({
      where: { id: existing.id },
      data: updateData,
    });

    const staleInfo = getRateStatusMessage(updated);

    return successResponse({
      ...updated,
      isStale: isRateConfigStale(updated),
      message: staleInfo.message,
    });
  } catch (error) {
    return handleApiError(error);
  }
}