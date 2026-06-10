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
    const { departments } = body;

    if (!departments || !Array.isArray(departments)) {
      return errorResponse('JSON data must contain a "departments" array.', 400);
    }

    if (departments.length === 0) {
      return errorResponse('No department data to import.', 400);
    }

    // Fetch existing departments
    const existingDepts = await prisma.department.findMany({ select: { name: true } });
    const existingNames = new Set(existingDepts.map(d => d.name.toLowerCase().trim()));
    const importedNames = new Set<string>();

    const errors: string[] = [];
    const validatedDepts: any[] = [];

    for (let i = 0; i < departments.length; i++) {
      const rowNum = i + 1;
      const dept = departments[i];

      if (!dept || typeof dept !== 'object') {
        errors.push(`Row ${rowNum}: Invalid data object`);
        continue;
      }

      const name = dept.name?.trim();
      const nameKana = dept.nameKana?.trim();
      const description = dept.description?.trim() || null;

      const rowDetails: string[] = [];

      if (!name) rowDetails.push('Department Name is required');
      if (!nameKana) rowDetails.push('Department Name (Kana) is required');

      if (name) {
        const lowerName = name.toLowerCase();
        if (existingNames.has(lowerName)) {
          rowDetails.push(`Department "${name}" already exists`);
        } else if (importedNames.has(lowerName)) {
          rowDetails.push(`Duplicate department name "${name}" in import batch`);
        } else {
          importedNames.add(lowerName);
        }
      }

      if (rowDetails.length > 0) {
        errors.push(`Row ${rowNum}: ${rowDetails.join(', ')}`);
      } else {
        validatedDepts.push({ name, nameKana, description });
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
      for (const deptData of validatedDepts) {
        const department = await tx.department.create({ data: deptData });

        logDatabaseChange({
          action: 'CREATE',
          model: 'Department',
          recordId: department.id,
          details: { name: department.name, nameKana: department.nameKana, importSource: 'BULK_JSON_IMPORT' },
          user,
        });
      }
    });

    return successResponse({
      message: `Successfully imported ${validatedDepts.length} departments.`,
      count: validatedDepts.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
