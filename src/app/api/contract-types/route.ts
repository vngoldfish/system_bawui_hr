import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, createdResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const createContractTypeSchema = z.object({
  name: z.string().min(1, '雇用形態名は必須です'),
  nameKana: z.string().min(1, '雇用形態名（カナ）は必須です'),
  description: z.string().optional().nullable(),
  defaultEndDateType: z.enum(['none', 'fixed']).default('none'),
  defaultSalaryType: z.enum(['月給', '日給', '時給']).default('月給'),
  defaultWorkDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  defaultStandardHoursPerDay: z.coerce.number().min(0).max(24).default(8),
  defaultCheckIn: z.string().default('08:00'),
  defaultCheckOut: z.string().default('17:00'),
  defaultBreakStart: z.string().default('12:00'),
  defaultBreakEnd: z.string().default('13:00'),
  defaultHolidayWorkCountsAsOvertime: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

// GET all contract types
export async function GET() {
  try {
    const contractTypes = await prisma.contractType.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
    return successResponse(contractTypes);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST new contract type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createContractTypeSchema.parse(body);

    const contractType = await prisma.contractType.create({ data });
    return createdResponse(contractType);
  } catch (error) {
    return handleApiError(error);
  }
}
