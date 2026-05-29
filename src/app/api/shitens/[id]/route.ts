import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';

const updateShitenSchema = z.object({
  name: z.string().min(1, '支店名は必須です').optional(),
  nameKana: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  employeeIds: z.array(z.string()).optional(),
});

// PUT update branch
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
    const data = updateShitenSchema.parse(body);
    const { employeeIds, ...shitenData } = data;

    const existing = await prisma.shiten.findUnique({ where: { id } });
    if (!existing) return errorResponse('支店が見つかりません', 404);

    const shiten = await prisma.shiten.update({
      where: { id },
      data: {
        ...shitenData,
        ...(employeeIds !== undefined && {
          employees: {
            set: employeeIds.map(eid => ({ id: eid })),
          },
        }),
      },
      include: {
        _count: { select: { employees: true } },
      }
    });

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'Shiten',
      recordId: shiten.id,
      details: {
        name: shiten.name,
        nameKana: shiten.nameKana,
      },
    });

    return successResponse(shiten);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE branch
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

    const existing = await prisma.shiten.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!existing) return errorResponse('支店が見つかりません', 404);

    if (existing._count.employees > 0) {
      return errorResponse('この支店には従業員が所属しているため削除できません');
    }

    const deletedShiten = await prisma.shiten.delete({ where: { id } });

    logDatabaseChange({
      request: _request,
      action: 'DELETE',
      model: 'Shiten',
      recordId: id,
      details: {
        name: deletedShiten.name,
        nameKana: deletedShiten.nameKana,
      },
    });

    return successResponse({ message: '支店を削除しました' });
  } catch (error) {
    return handleApiError(error);
  }
}
