import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createdResponse, errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { getSessionUser } from '@/lib/session';
import { logDatabaseChange } from '@/lib/audit-logger';
import {
  formatShiftDate,
  getShiftTimes,
  normalizeShiftType,
  parseMonthBounds,
  type ShiftType,
} from '@/lib/shift-helpers';
import { z } from 'zod';

const shiftItemSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftType: z.enum(['day', 'night', 'early', 'late', 'off']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional().default(''),
});

const bulkSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  shifts: z.array(shiftItemSchema).min(1),
});

function toShiftDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const employeeId = searchParams.get('employeeId');
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return errorResponse('month query (YYYY-MM) is required', 400);
    }

    const { startUtc, endUtc } = parseMonthBounds(month);
    const shifts = await prisma.shiftAssignment.findMany({
      where: {
        date: { gte: startUtc, lte: endUtc },
        ...(employeeId ? { employeeId } : {}),
      },
      orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
    });

    const rows = shifts.map(s => ({
      id: s.id,
      employeeId: s.employeeId,
      date: formatShiftDate(s.date),
      shiftType: s.shiftType,
      startTime: s.startTime,
      endTime: s.endTime,
      notes: s.notes,
    }));

    return successResponse({ month, shifts: rows });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const parsed = bulkSchema.parse(body);
    const results = [];

    for (const item of parsed.shifts) {
      const shiftType = normalizeShiftType(item.shiftType) as ShiftType;
      const preset = getShiftTimes(shiftType);
      const data = {
        employeeId: item.employeeId,
        date: toShiftDate(item.date),
        shiftType,
        startTime: item.startTime || preset.startTime,
        endTime: item.endTime || preset.endTime,
        notes: item.notes || '',
      };

      const saved = await prisma.shiftAssignment.upsert({
        where: {
          employeeId_date: {
            employeeId: item.employeeId,
            date: data.date,
          },
        },
        create: data,
        update: {
          shiftType: data.shiftType,
          startTime: data.startTime,
          endTime: data.endTime,
          notes: data.notes,
        },
      });
      results.push(saved);
    }

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'ShiftAssignment',
      recordId: parsed.month || 'bulk',
      details: { count: results.length },
    });

    return createdResponse({
      count: results.length,
      shifts: results.map(s => ({
        id: s.id,
        employeeId: s.employeeId,
        date: formatShiftDate(s.date),
        shiftType: s.shiftType,
        startTime: s.startTime,
        endTime: s.endTime,
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
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const employeeId = searchParams.get('employeeId');
    if (!month) return errorResponse('month is required', 400);

    const { startUtc, endUtc } = parseMonthBounds(month);
    const deleted = await prisma.shiftAssignment.deleteMany({
      where: {
        date: { gte: startUtc, lte: endUtc },
        ...(employeeId ? { employeeId } : {}),
      },
    });

    return successResponse({ deleted: deleted.count });
  } catch (error) {
    return handleApiError(error);
  }
}