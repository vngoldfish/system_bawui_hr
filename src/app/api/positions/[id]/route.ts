import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { getSessionUser } from '@/lib/session';
import { logDatabaseChange } from '@/lib/audit-logger';

const updatePositionSchema = z.object({
  name: z.string().min(1, '役職名は必須です').optional(),
  nameKana: z.string().min(1, '役職名（カナ）は必須です').optional(),
  description: z.string().optional().nullable(),
  allowance: z.number().nonnegative('手当は0以上にする必要があります').optional(),
});

// PUT update position
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
    const data = updatePositionSchema.parse(body);

    const existing = await prisma.position.findUnique({ where: { id } });
    if (!existing) return errorResponse('役職が見つかりません', 404);

    const position = await prisma.position.update({
      where: { id },
      data,
    });

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'Position',
      recordId: position.id,
      details: { name: position.name, nameKana: position.nameKana },
    });

    return successResponse(position);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE position
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

    const existing = await prisma.position.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!existing) return errorResponse('役職が見つかりません', 404);

    if (existing._count.employees > 0) {
      return errorResponse(`この役職には${existing._count.employees}人の従業員が所属しているため削除できません`);
    }

    await prisma.position.delete({ where: { id } });

    logDatabaseChange({
      request: _request,
      action: 'DELETE',
      model: 'Position',
      recordId: id,
      details: { name: existing.name, nameKana: existing.nameKana },
    });

    return successResponse({ message: '役職を削除しました' });
  } catch (error) {
    return handleApiError(error);
  }
}
