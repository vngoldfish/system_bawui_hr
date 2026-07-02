import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';
import { getAttendanceSystemSettings } from '@/lib/system-settings';
import { parseShiftRegistrationPolicy } from '@/lib/shift-registration-policy';

const categoryRuleSchema = z.object({
  category: z.string(),
  registrationRequired: z.boolean(),
  beforeDeadlineUnregistered: z.enum(['available', 'unavailable']),
  afterDeadlineUnregistered: z.enum(['available', 'unavailable']),
});

const shiftPolicySchema = z.object({
  deadlineDay: z.number().int().min(1).max(31),
  globalUnregisteredDefault: z.enum(['available', 'unavailable']),
  categoryRules: z.array(categoryRuleSchema),
});

const updateSettingsSchema = z.object({
  attendanceAutoScheduleEnabled: z.boolean().optional(),
  attendanceGrossEstimateEnabled: z.boolean().optional(),
  shiftRegistrationRequired: z.boolean().optional(),
  shiftRegistrationDeadlineDay: z.number().int().min(1).max(31).optional(),
  shiftRegistrationPolicy: shiftPolicySchema.optional(),
  incomeTaxThreshold: z.number().int().min(0).optional(),
});

export async function GET(_request: NextRequest) {
  try {
    const settings = await getAttendanceSystemSettings();
    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const data = updateSettingsSchema.parse(body);

    if (
      data.attendanceAutoScheduleEnabled === undefined &&
      data.attendanceGrossEstimateEnabled === undefined &&
      data.shiftRegistrationRequired === undefined &&
      data.shiftRegistrationDeadlineDay === undefined &&
      data.shiftRegistrationPolicy === undefined &&
      data.incomeTaxThreshold === undefined
    ) {
      return errorResponse('No settings to update', 400);
    }

    let company = await prisma.company.findFirst();

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: '株式会社ロング',
          nameKana: 'カブシキガイシャロング',
          representative: 'ロン グエン',
          representativeTitle: '代表取締役',
          established: '2015-04-01',
          capital: '10,000,000円',
          employees: '14名',
          industry: 'IT・ソフトウェア',
          registrationNumber: 'T1234567890123',
          address: '〒100-0001 東京都千代田区千代田1-1-1 ロングビル3F',
          phone: '03-1234-5678',
          fax: '03-1234-5679',
          email: 'info@long-corp.jp',
          website: 'https://www.long-corp.jp',
          bankName: '三菱UFJ銀行',
          branchName: '東京支店',
          accountType: '普通',
          accountNumber: '1234567',
          accountHolder: 'カブシキガイシャロング',
          salaryCutoffDay: '末日',
          payday: '25',
          roundingPolicy: 'exact',
          healthInsuranceRate: 9.98,
          attendanceAutoScheduleEnabled: data.attendanceAutoScheduleEnabled ?? true,
          attendanceGrossEstimateEnabled: data.attendanceGrossEstimateEnabled ?? true,
          incomeTaxThreshold: data.incomeTaxThreshold ?? 88000,
        },
      });
    } else if (
      data.attendanceAutoScheduleEnabled !== undefined ||
      data.attendanceGrossEstimateEnabled !== undefined ||
      data.shiftRegistrationRequired !== undefined ||
      data.incomeTaxThreshold !== undefined
    ) {
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          ...(data.attendanceAutoScheduleEnabled !== undefined
            ? { attendanceAutoScheduleEnabled: data.attendanceAutoScheduleEnabled }
            : {}),
          ...(data.attendanceGrossEstimateEnabled !== undefined
            ? { attendanceGrossEstimateEnabled: data.attendanceGrossEstimateEnabled }
            : {}),
          ...(data.shiftRegistrationRequired !== undefined
            ? { shiftRegistrationRequired: data.shiftRegistrationRequired }
            : {}),
          ...(data.incomeTaxThreshold !== undefined
            ? { incomeTaxThreshold: data.incomeTaxThreshold }
            : {}),
        },
      });
    }

    if (data.shiftRegistrationDeadlineDay !== undefined) {
      await prisma.$executeRaw`
        UPDATE "companies"
        SET "shiftRegistrationDeadlineDay" = ${data.shiftRegistrationDeadlineDay}
        WHERE "id" = ${company.id}
      `;
    }

    if (data.shiftRegistrationPolicy !== undefined) {
      const normalized = parseShiftRegistrationPolicy(
        data.shiftRegistrationPolicy,
        data.shiftRegistrationDeadlineDay ?? 25
      );
      const json = JSON.stringify(normalized);
      await prisma.$executeRaw`
        UPDATE "companies"
        SET "shiftRegistrationPolicyRules" = ${json}::jsonb
        WHERE "id" = ${company.id}
      `;
    }

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'Company',
      recordId: company.id,
      details: data,
    });

    const settings = await getAttendanceSystemSettings();
    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}