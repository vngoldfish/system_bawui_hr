import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';

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
    const { positions } = body;

    if (!positions || !Array.isArray(positions)) {
      return errorResponse('JSON data must contain a "positions" array.', 400);
    }

    if (positions.length === 0) {
      return errorResponse('No position data to import.', 400);
    }

    // Fetch existing positions
    const existingPos = await prisma.position.findMany({ select: { name: true } });
    const existingNames = new Set(existingPos.map(p => p.name.toLowerCase().trim()));
    const importedNames = new Set<string>();

    const errors: string[] = [];
    const validatedPos: any[] = [];

    for (let i = 0; i < positions.length; i++) {
      const rowNum = i + 1;
      const pos = positions[i];

      if (!pos || typeof pos !== 'object') {
        errors.push(`Row ${rowNum}: Invalid data object`);
        continue;
      }

      const name = pos.name?.trim();
      const description = pos.description?.trim() || null;

      const rowDetails: string[] = [];

      if (!name) rowDetails.push('Position Name is required');

      if (name) {
        const lowerName = name.toLowerCase();
        if (existingNames.has(lowerName)) {
          rowDetails.push(`Position "${name}" already exists`);
        } else if (importedNames.has(lowerName)) {
          rowDetails.push(`Duplicate position name "${name}" in import batch`);
        } else {
          importedNames.add(lowerName);
        }
      }

      if (rowDetails.length > 0) {
        errors.push(`Row ${rowNum}: ${rowDetails.join(', ')}`);
      } else {
        validatedPos.push({ name, description });
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: errors,
      }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const posData of validatedPos) {
        const position = await tx.position.create({ data: posData });

        logDatabaseChange({
          action: 'CREATE',
          model: 'Position',
          recordId: position.id,
          details: { name: position.name, importSource: 'BULK_JSON_IMPORT' },
          user,
        });
      }
    });

    return successResponse({
      message: `Successfully imported ${validatedPos.length} positions.`,
      count: validatedPos.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
