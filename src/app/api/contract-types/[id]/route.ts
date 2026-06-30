import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { getSessionUser } from '@/lib/session';
import { logDatabaseChange } from '@/lib/audit-logger';

const updateContractTypeSchema = z.object({
  name: z.string().min(1).optional(),
  nameKana: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  defaultEndDateType: z.enum(['none', 'fixed']).optional(),
  defaultSalaryType: z.enum(['月給', '日給', '時給']).optional(),
  defaultWorkDays: z.array(z.number().int().min(0).max(6)).optional(),
  defaultStandardHoursPerDay: z.coerce.number().min(0).max(24).optional(),
  defaultCheckIn: z.string().optional(),
  defaultCheckOut: z.string().optional(),
  defaultBreakStart: z.string().optional(),
  defaultBreakEnd: z.string().optional(),
  defaultHolidayWorkCountsAsOvertime: z.boolean().optional(),
  category: z.enum(['SEISHAIN', 'KEIYAKU', 'PART', 'ARUBAITO', 'HAKKEN', 'CUSTOM']).optional(),
  payrollMode: z.enum(['FULL', 'HOURS_ONLY']).optional(),
  overtimeMultiplier: z.coerce.number().min(1).max(3).optional(),
  socialInsuranceDefault: z.boolean().optional(),
  employmentInsuranceDefault: z.boolean().optional(),
  workersCompDefault: z.boolean().optional(),
  maxWeeklyHours: z.coerce.number().min(0).max(168).optional().nullable(),
  contractTemplateNotes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// PUT update contract type
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateContractTypeSchema.parse(body);

    const existing = await prisma.contractType.findUnique({ where: { id } });
    if (!existing) return errorResponse('雇用形態が見つかりません', 404);

    const contractType = await prisma.contractType.update({
      where: { id },
      data,
    });

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'ContractType',
      recordId: contractType.id,
      details: { name: contractType.name, nameKana: contractType.nameKana },
    });

    return successResponse(contractType);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE contract type
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getSessionUser(_request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const { id } = await params;

    const existing = await prisma.contractType.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!existing) return errorResponse('雇用形態が見つかりません', 404);

    if (existing._count.employees > 0) {
      return errorResponse(`この雇用形態には${existing._count.employees}人の従業員が所属しているため削除できません`);
    }

    await prisma.contractType.delete({ where: { id } });

    logDatabaseChange({
      request: _request,
      action: 'DELETE',
      model: 'ContractType',
      recordId: id,
      details: { name: existing.name, nameKana: existing.nameKana },
    });

    return successResponse({ message: '雇用形態を削除しました' });
  } catch (error) {
    return handleApiError(error);
  }
}
