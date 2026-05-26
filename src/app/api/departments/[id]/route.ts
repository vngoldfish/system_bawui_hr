import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';

const updateDepartmentSchema = z.object({
  name: z.string().min(1, '部署名は必須です').optional(),
  nameKana: z.string().min(1, '部署名（カナ）は必須です').optional(),
  description: z.string().optional().nullable(),
});

// PUT update department
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
    const data = updateDepartmentSchema.parse(body);

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return errorResponse('部署が見つかりません', 404);

    const department = await prisma.department.update({
      where: { id },
      data,
    });

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'Department',
      recordId: department.id,
      details: {
        name: department.name,
        nameKana: department.nameKana,
      },
    });

    return successResponse(department);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE department
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

    const existing = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!existing) return errorResponse('部署が見つかりません', 404);

    if (existing._count.employees > 0) {
      return errorResponse(`この部署には${existing._count.employees}人の従業員が所属しているため削除できません`);
    }

    const deletedDept = await prisma.department.delete({ where: { id } });

    logDatabaseChange({
      request: _request,
      action: 'DELETE',
      model: 'Department',
      recordId: id,
      details: {
        name: deletedDept.name,
        nameKana: deletedDept.nameKana,
      },
    });

    return successResponse({ message: '部署を削除しました' });
  } catch (error) {
    return handleApiError(error);
  }
}
