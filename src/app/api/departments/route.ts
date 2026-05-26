import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, createdResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';

const createDepartmentSchema = z.object({
  name: z.string().min(1, '部署名は必須です'),
  nameKana: z.string().min(1, '部署名（カナ）は必須です'),
  description: z.string().optional().nullable(),
});

// GET all departments
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const departments = await prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
    return successResponse(departments);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST new department
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
    const data = createDepartmentSchema.parse(body);

    const department = await prisma.department.create({ data });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'Department',
      recordId: department.id,
      details: {
        name: department.name,
        nameKana: department.nameKana,
      },
    });

    return createdResponse(department);
  } catch (error) {
    return handleApiError(error);
  }
}
