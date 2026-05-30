import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, handleApiError, errorResponse } from '@/lib/api-utils';

// GET all permissions
export async function GET(_request: NextRequest) {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' },
      ],
    });
    return successResponse(permissions);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST create a new permission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, name, category, description } = body;

    if (!key || !name || !category) {
      return errorResponse('キー、表示名、およびカテゴリは必須入力です', 400);
    }

    const trimmedKey = key.trim().toLowerCase();

    // Check unique key
    const existing = await prisma.permission.findUnique({
      where: { key: trimmedKey },
    });

    if (existing) {
      return errorResponse(`権限キー「${trimmedKey}」は既に存在します。`, 409);
    }

    const permission = await prisma.permission.create({
      data: {
        key: trimmedKey,
        name: name.trim(),
        category: category.trim(),
        description: description?.trim() || null,
      },
    });

    return successResponse(permission);
  } catch (error) {
    return handleApiError(error);
  }
}
