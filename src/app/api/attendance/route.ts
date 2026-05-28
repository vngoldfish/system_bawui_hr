import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createdResponse, errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';

// GET attendance records
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    const where: any = {};

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    if (isEmployeeMode) {
      where.employeeId = user.id;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (date) {
      where.date = {
        gte: new Date(date),
        lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
      };
    }

    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 1);
      where.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: { date: 'desc' },
    });

    return successResponse(records);
  } catch (error) {
    return handleApiError(error);
  }
}

// Helper to parse date and time safely
function parseDateTime(dateStr: string, timeVal: string | null) {
  if (!timeVal) return null;
  // If timeVal already contains full datetime (like YYYY-MM-DDTHH:MM...)
  if (timeVal.includes('T') || timeVal.includes('-')) {
    const d = new Date(timeVal);
    if (!isNaN(d.getTime())) return d;
  }
  const baseDate = dateStr.split('T')[0];
  const cleanTime = timeVal.length === 5 ? `${timeVal}:00` : timeVal;
  const d = new Date(`${baseDate}T${cleanTime}`);
  return isNaN(d.getTime()) ? null : d;
}

// POST new attendance record
export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    if (isEmployeeMode) {
      return errorResponse('Forbidden', 403);
    }

    const data = await request.json();

    const record = await prisma.attendanceRecord.create({
      data: {
        employeeId: data.employeeId,
        date: new Date(data.date),
        checkIn: parseDateTime(data.date, data.checkIn),
        checkOut: parseDateTime(data.date, data.checkOut),
        breakStart: parseDateTime(data.date, data.breakStart),
        breakEnd: parseDateTime(data.date, data.breakEnd),
        overtimeHours: parseFloat(data.overtimeHours) || 0,
        notes: data.notes || '',
        status: data.status || 'PRESENT',
      },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
          },
        },
      },
    });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'AttendanceRecord',
      recordId: record.id,
      details: {
        employeeId: record.employeeId,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: record.status,
      },
    });

    return createdResponse(record);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT update attendance record
export async function PUT(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    if (isEmployeeMode) {
      return errorResponse('Forbidden', 403);
    }

    const data = await request.json();

    if (!data.id) {
      return errorResponse('Record ID is required', 400);
    }

    const record = await prisma.attendanceRecord.update({
      where: { id: data.id },
      data: {
        checkIn: parseDateTime(data.date, data.checkIn),
        checkOut: parseDateTime(data.date, data.checkOut),
        breakStart: parseDateTime(data.date, data.breakStart),
        breakEnd: parseDateTime(data.date, data.breakEnd),
        overtimeHours: parseFloat(data.overtimeHours) || 0,
        notes: data.notes || '',
        status: data.status || 'PRESENT',
      },
      include: {
        employee: {
          include: {
            department: true,
            position: true,
          },
        },
      },
    });

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'AttendanceRecord',
      recordId: record.id,
      details: {
        employeeId: record.employeeId,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: record.status,
      },
    });

    return successResponse(record);
  } catch (error) {
    return handleApiError(error);
  }
}

