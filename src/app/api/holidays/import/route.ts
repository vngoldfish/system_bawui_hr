import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { getSessionUser } from '@/lib/session';
import { JP_NATIONAL_HOLIDAYS_2026 } from '@/lib/shift-helpers';
import { z } from 'zod';

const importSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2035).default(2026),
  preset: z.enum(['jp_2026']).default('jp_2026'),
});

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json().catch(() => ({}));
    const { year, preset } = importSchema.parse(body);

    const items =
      preset === 'jp_2026' && year === 2026
        ? JP_NATIONAL_HOLIDAYS_2026
        : [];

    if (items.length === 0) {
      return errorResponse('No preset holidays for this year', 400);
    }

    let created = 0;
    let skipped = 0;

    for (const item of items) {
      const date = new Date(`${item.date}T00:00:00.000Z`);
      const existing = await prisma.holiday.findUnique({ where: { date } });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.holiday.create({
        data: {
          date,
          name: item.name,
          type: 'NATIONAL',
          isPaidHoliday: true,
          isActive: true,
        },
      });
      created++;
    }

    return successResponse({ created, skipped, year, preset });
  } catch (error) {
    return handleApiError(error);
  }
}