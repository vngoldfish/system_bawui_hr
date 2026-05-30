import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, handleApiError } from '@/lib/api-utils';

// GET all role permissions
export async function GET(_request: NextRequest) {
  try {
    const rolePermissions = await prisma.rolePermission.findMany({
      orderBy: { role: 'asc' },
    });
    return successResponse(rolePermissions);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST update a role's permissions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, permissions } = body;

    if (!role || !Array.isArray(permissions)) {
      return handleApiError(new Error('有効なロール名と権限配列を指定してください'));
    }

    // Run inside transaction to ensure atomicity
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { role } }),
      prisma.rolePermission.createMany({
        data: permissions.map((permission: string) => ({
          role,
          permission,
        })),
      }),
    ]);

    return successResponse({ message: '権限設定を更新しました。' });
  } catch (error) {
    return handleApiError(error);
  }
}
