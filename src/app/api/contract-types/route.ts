import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, createdResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { getSessionUser } from '@/lib/session';
import { logDatabaseChange } from '@/lib/audit-logger';

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
  category: z.enum(['SEISHAIN', 'KEIYAKU', 'PART', 'ARUBAITO', 'HAKKEN', 'CUSTOM']).default('CUSTOM'),
  payrollMode: z.enum(['FULL', 'HOURS_ONLY']).default('FULL'),
  overtimeMultiplier: z.coerce.number().min(1).max(3).default(1.25),
  socialInsuranceDefault: z.boolean().default(true),
  employmentInsuranceDefault: z.boolean().default(true),
  workersCompDefault: z.boolean().default(true),
  maxWeeklyHours: z.coerce.number().min(0).max(168).optional().nullable(),
  contractTemplateNotes: z.string().default(''),
  isActive: z.boolean().default(true),
});

// GET all contract types
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

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
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const data = createContractTypeSchema.parse(body);

    const contractType = await prisma.contractType.create({ data });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'ContractType',
      recordId: contractType.id,
      details: { name: contractType.name, nameKana: contractType.nameKana },
    });

    return createdResponse(contractType);
  } catch (error) {
    return handleApiError(error);
  }
}
