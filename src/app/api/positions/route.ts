import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, createdResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { getSessionUser } from '@/lib/session';
import { logDatabaseChange } from '@/lib/audit-logger';

const createPositionSchema = z.object({
  name: z.string().min(1, '役職名は必須です'),
  nameKana: z.string().min(1, '役職名（カナ）は必須です'),
  description: z.string().optional().nullable(),
  allowance: z.number().nonnegative('手当は0以上にする必要があります').optional().default(0),
});

// GET all positions
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const positions = await prisma.position.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
    return successResponse(positions);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST new position
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
    const data = createPositionSchema.parse(body);

    const position = await prisma.position.create({ data });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'Position',
      recordId: position.id,
      details: { name: position.name, nameKana: position.nameKana },
    });

    return createdResponse(position);
  } catch (error) {
    return handleApiError(error);
  }
}
