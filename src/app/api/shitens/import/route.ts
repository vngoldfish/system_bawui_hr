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
    const { shitens } = body;

    if (!shitens || !Array.isArray(shitens)) {
      return errorResponse('JSON data must contain a "shitens" array.', 400);
    }

    if (shitens.length === 0) {
      return errorResponse('No shiten data to import.', 400);
    }

    // Fetch existing shitens
    const existingShitens = await prisma.shiten.findMany({ select: { name: true } });
    const existingNames = new Set(existingShitens.map(s => s.name.toLowerCase().trim()));
    const importedNames = new Set<string>();

    const errors: string[] = [];
    const validatedShitens: any[] = [];

    for (let i = 0; i < shitens.length; i++) {
      const rowNum = i + 1;
      const shiten = shitens[i];

      if (!shiten || typeof shiten !== 'object') {
        errors.push(`Row ${rowNum}: Invalid data object`);
        continue;
      }

      const name = shiten.name?.trim();
      const nameKana = shiten.nameKana?.trim() || null;
      const address = shiten.address?.trim() || null;
      const phone = shiten.phone?.trim() || null;

      const rowDetails: string[] = [];

      if (!name) rowDetails.push('Shiten Name is required');

      if (name) {
        const lowerName = name.toLowerCase();
        if (existingNames.has(lowerName)) {
          rowDetails.push(`Shiten "${name}" already exists`);
        } else if (importedNames.has(lowerName)) {
          rowDetails.push(`Duplicate shiten name "${name}" in import batch`);
        } else {
          importedNames.add(lowerName);
        }
      }

      if (rowDetails.length > 0) {
        errors.push(`Row ${rowNum}: ${rowDetails.join(', ')}`);
      } else {
        validatedShitens.push({ name, nameKana, address, phone });
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
      for (const shitenData of validatedShitens) {
        const shiten = await tx.shiten.create({ data: shitenData });

        logDatabaseChange({
          action: 'CREATE',
          model: 'Shiten',
          recordId: shiten.id,
          details: { name: shiten.name, importSource: 'BULK_JSON_IMPORT' },
          user,
        });
      }
    });

    return successResponse({
      message: `Successfully imported ${validatedShitens.length} branches.`,
      count: validatedShitens.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
