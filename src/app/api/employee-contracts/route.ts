import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, createdResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const employeeContractSchema = z.object({
  employeeId: z.string().min(1),
  contractTypeId: z.string().min(1),
  name: z.string().min(1).optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  workDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  standardHoursPerDay: z.coerce.number().min(0).max(24).default(8),
  defaultCheckIn: z.string().default('08:00'),
  defaultCheckOut: z.string().default('17:00'),
  defaultBreakStart: z.string().default('12:00'),
  defaultBreakEnd: z.string().default('13:00'),
  holidayWorkCountsAsOvertime: z.boolean().default(true),
  isActive: z.boolean().default(true),
  notes: z.string().optional().default(''),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (activeOnly) where.isActive = true;

    const contracts = await prisma.employeeContract.findMany({
      where,
      include: {
        employee: { include: { department: true, position: true } },
        contractType: true,
      },
      orderBy: [{ employeeId: 'asc' }, { startDate: 'desc' }],
    });

    return successResponse(contracts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = employeeContractSchema.parse(body);

    const data = {
      ...parsed,
      name: parsed.name || '勤務契約',
      startDate: new Date(parsed.startDate),
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      workDays: parsed.workDays,
    };

    const contract = await prisma.employeeContract.create({
      data,
      include: { contractType: true },
    });

    return createdResponse(contract);
  } catch (error) {
    return handleApiError(error);
  }
}
