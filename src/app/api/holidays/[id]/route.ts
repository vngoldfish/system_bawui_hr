import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const updateHolidaySchema = z.object({
  date: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  type: z.string().optional(),
  isPaidHoliday: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateHolidaySchema.parse(body);

    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) return errorResponse('休日が見つかりません', 404);

    const data: any = { ...parsed };
    if (parsed.date) data.date = new Date(`${parsed.date.split('T')[0]}T00:00:00.000Z`);

    const holiday = await prisma.holiday.update({ where: { id }, data });
    return successResponse(holiday);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) return errorResponse('休日が見つかりません', 404);

    await prisma.holiday.delete({ where: { id } });
    return successResponse({ message: '休日を削除しました' });
  } catch (error) {
    return handleApiError(error);
  }
}
