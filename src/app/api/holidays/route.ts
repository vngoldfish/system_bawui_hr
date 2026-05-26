import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, createdResponse, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const holidaySchema = z.object({
  date: z.string().min(1),
  name: z.string().min(1),
  type: z.string().default('NATIONAL'),
  isPaidHoliday: z.boolean().default(false),
  isActive: z.boolean().default(true),
  notes: z.string().optional().default(''),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const where: any = { isActive: true };
    if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    } else if (year) {
      const y = parseInt(year, 10);
      where.date = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return successResponse(holidays);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = holidaySchema.parse(body);
    const dateOnly = parsed.date.split('T')[0];

    const holiday = await prisma.holiday.create({
      data: {
        ...parsed,
        date: new Date(`${dateOnly}T00:00:00.000Z`),
      },
    });

    return createdResponse(holiday);
  } catch (error) {
    return handleApiError(error);
  }
}
