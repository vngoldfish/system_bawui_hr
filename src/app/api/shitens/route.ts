import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, createdResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';

const createShitenSchema = z.object({
  name: z.string().min(1, '支店名は必須です'),
  nameKana: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  employeeIds: z.array(z.string()).optional().default([]),
});

// GET all branches
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const shitens = await prisma.shiten.findMany({
      include: {
        _count: { select: { employees: true } },
        employees: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            position: { select: { name: true } },
            status: true,
          }
        }
      },
      orderBy: { name: 'asc' },
    });
    return successResponse(shitens);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST new branch
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
    const data = createShitenSchema.parse(body);
    const { employeeIds, ...shitenData } = data;

    const shiten = await prisma.shiten.create({
      data: {
        ...shitenData,
        employees: {
          connect: employeeIds.map(id => ({ id })),
        },
      },
      include: {
        _count: { select: { employees: true } },
      }
    });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'Shiten',
      recordId: shiten.id,
      details: {
        name: shiten.name,
        nameKana: shiten.nameKana,
      },
    });

    return createdResponse(shiten);
  } catch (error) {
    return handleApiError(error);
  }
}
