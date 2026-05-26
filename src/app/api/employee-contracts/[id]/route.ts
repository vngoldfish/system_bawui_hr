import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const updateEmployeeContractSchema = z.object({
  contractTypeId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().optional().nullable(),
  workDays: z.array(z.number().int().min(0).max(6)).optional(),
  standardHoursPerDay: z.coerce.number().min(0).max(24).optional(),
  defaultCheckIn: z.string().optional(),
  defaultCheckOut: z.string().optional(),
  defaultBreakStart: z.string().optional(),
  defaultBreakEnd: z.string().optional(),
  holidayWorkCountsAsOvertime: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateEmployeeContractSchema.parse(body);

    const existing = await prisma.employeeContract.findUnique({ where: { id } });
    if (!existing) return errorResponse('従業員契約が見つかりません', 404);

    const data: any = { ...parsed };
    if (parsed.startDate) data.startDate = new Date(parsed.startDate);
    if (Object.prototype.hasOwnProperty.call(parsed, 'endDate')) {
      data.endDate = parsed.endDate ? new Date(parsed.endDate) : null;
    }

    const contract = await prisma.employeeContract.update({
      where: { id },
      data,
      include: { contractType: true },
    });

    return successResponse(contract);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.employeeContract.findUnique({ where: { id } });
    if (!existing) return errorResponse('従業員契約が見つかりません', 404);

    await prisma.employeeContract.delete({ where: { id } });
    return successResponse({ message: '従業員契約を削除しました' });
  } catch (error) {
    return handleApiError(error);
  }
}
