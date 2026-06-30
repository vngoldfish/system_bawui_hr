import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createdResponse, errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { getSessionUser } from '@/lib/session';
import {
  getNextMonthStr,
  normalizeShiftPreference,
  toAvailabilityDate,
} from '@/lib/shift-availability-helpers';
import { formatShiftDate, parseMonthBounds } from '@/lib/shift-helpers';
import { z } from 'zod';

const daySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftPreference: z.enum(['any', 'day', 'night', 'early', 'late', 'off']).default('any'),
  notes: z.string().optional().default(''),
});

const postSchema = z.object({
  targetMonth: z.string().regex(/^\d{4}-\d{2}$/),
  days: z.array(daySchema),
  replaceMonth: z.boolean().optional().default(true),
  employeeId: z.string().optional(),
});

async function assertEligibleEmployee(employeeId: string) {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, status: true },
  });
  if (!emp) return { ok: false as const, message: 'Employee not found' };
  if (!['ACTIVE', 'ON_LEAVE'].includes(emp.status)) {
    return { ok: false as const, message: '在籍中の従業員のみ登録できます' };
  }
  return { ok: true as const, employee: emp };
}

function isHrAdmin(role?: string) {
  return role === 'SUPER_ADMIN' || role === 'HR_MANAGER';
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const employeeId = searchParams.get('employeeId');
    const byDate = searchParams.get('byDate') === '1';

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    const hrAdmin = isHrAdmin(user.role);

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return errorResponse('month query (YYYY-MM) is required', 400);
    }

    const { startUtc, endUtc } = parseMonthBounds(month);

    if (isEmployeeMode && !hrAdmin) {
      const check = await assertEligibleEmployee(user.id);
      if (!check.ok) return errorResponse(check.message, 403);

      const rows = await prisma.shiftAvailability.findMany({
        where: { employeeId: user.id, targetMonth: month, date: { gte: startUtc, lte: endUtc } },
        orderBy: { date: 'asc' },
      });
      return successResponse({
        month,
        employeeId: user.id,
        days: rows.map(r => ({
          date: formatShiftDate(r.date),
          shiftPreference: r.shiftPreference,
          notes: r.notes,
        })),
      });
    }

    const where: { targetMonth: string; date: { gte: Date; lte: Date }; employeeId?: string } = {
      targetMonth: month,
      date: { gte: startUtc, lte: endUtc },
    };
    if (employeeId) where.employeeId = employeeId;

    const rows = await prisma.shiftAvailability.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
            contractType: { select: { name: true, category: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { employee: { lastName: 'asc' } }],
    });

    if (byDate) {
      const byDateMap: Record<string, typeof rows> = {};
      for (const r of rows) {
        const key = formatShiftDate(r.date);
        if (!byDateMap[key]) byDateMap[key] = [];
        byDateMap[key].push(r);
      }
      return successResponse({ month, byDate: byDateMap });
    }

    if (employeeId) {
      return successResponse({
        month,
        employeeId,
        days: rows.map(r => ({
          date: formatShiftDate(r.date),
          shiftPreference: r.shiftPreference,
          notes: r.notes,
        })),
      });
    }

    return successResponse({
      month,
      registrations: rows.map(r => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeCode: r.employee.employeeCode,
        firstName: r.employee.firstName,
        lastName: r.employee.lastName,
        department: r.employee.department?.name || '',
        contractType: r.employee.contractType?.name || '',
        date: formatShiftDate(r.date),
        shiftPreference: r.shiftPreference,
        notes: r.notes,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    const hrAdmin = isHrAdmin(user.role);

    if (!hrAdmin && !isEmployeeMode) {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const data = postSchema.parse(body);
    const employeeId = hrAdmin && data.employeeId ? data.employeeId : user.id;
    if (!employeeId) return errorResponse('employeeId is required', 400);

    const check = await assertEligibleEmployee(employeeId);
    if (!check.ok) return errorResponse(check.message, 403);

    const nextMonth = getNextMonthStr();
    if (!hrAdmin && data.targetMonth !== nextMonth) {
      return errorResponse(`登録できるのは翌月（${nextMonth}）のみです`, 400);
    }

    const { startUtc, endUtc } = parseMonthBounds(data.targetMonth);

    if (data.replaceMonth) {
      await prisma.shiftAvailability.deleteMany({
        where: { employeeId, targetMonth: data.targetMonth },
      });
    }

    const created = [];
    for (const day of data.days) {
      if (!day.date.startsWith(data.targetMonth)) continue;
      const saved = await prisma.shiftAvailability.upsert({
        where: {
          employeeId_date: {
            employeeId,
            date: toAvailabilityDate(day.date),
          },
        },
        create: {
          employeeId,
          targetMonth: data.targetMonth,
          date: toAvailabilityDate(day.date),
          shiftPreference: normalizeShiftPreference(day.shiftPreference),
          notes: day.notes || '',
        },
        update: {
          targetMonth: data.targetMonth,
          shiftPreference: normalizeShiftPreference(day.shiftPreference),
          notes: day.notes || '',
        },
      });
      created.push(saved);
    }

    return createdResponse({
      targetMonth: data.targetMonth,
      employeeId,
      count: created.length,
      days: created.map(r => ({
        date: formatShiftDate(r.date),
        shiftPreference: r.shiftPreference,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const date = searchParams.get('date');
    if (!month) return errorResponse('month is required', 400);

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    const hrAdmin = isHrAdmin(user.role);
    const employeeId = hrAdmin
      ? searchParams.get('employeeId')
      : isEmployeeMode
        ? user.id
        : searchParams.get('employeeId');

    if (!employeeId) return errorResponse('employeeId is required', 400);

    if (employeeId !== user.id && !hrAdmin) {
      return errorResponse('Forbidden', 403);
    }

    if (date) {
      if (!date.startsWith(month)) {
        return errorResponse('date must belong to month', 400);
      }
      const deleted = await prisma.shiftAvailability.deleteMany({
        where: {
          employeeId,
          targetMonth: month,
          date: toAvailabilityDate(date),
        },
      });
      return successResponse({ deleted: deleted.count, date });
    }

    const deleted = await prisma.shiftAvailability.deleteMany({
      where: { employeeId, targetMonth: month },
    });

    return successResponse({ deleted: deleted.count, month });
  } catch (error) {
    return handleApiError(error);
  }
}