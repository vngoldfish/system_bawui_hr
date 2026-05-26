import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const updateContractTypeSchema = z.object({
  name: z.string().min(1).optional(),
  nameKana: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  defaultEndDateType: z.enum(['none', 'fixed']).optional(),
  defaultSalaryType: z.enum(['月給', '日給', '時給']).optional(),
  isActive: z.boolean().optional(),
});

// PUT update contract type
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateContractTypeSchema.parse(body);

    const existing = await prisma.contractType.findUnique({ where: { id } });
    if (!existing) return errorResponse('雇用形態が見つかりません', 404);

    const contractType = await prisma.contractType.update({
      where: { id },
      data,
    });

    return successResponse(contractType);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE contract type
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.contractType.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!existing) return errorResponse('雇用形態が見つかりません', 404);

    if (existing._count.employees > 0) {
      return errorResponse(`この雇用形態には${existing._count.employees}人の従業員が所属しているため削除できません`);
    }

    await prisma.contractType.delete({ where: { id } });
    return successResponse({ message: '雇用形態を削除しました' });
  } catch (error) {
    return handleApiError(error);
  }
}
