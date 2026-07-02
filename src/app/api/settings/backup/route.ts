import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, createdResponse } from '@/lib/api-utils';
import { getSessionUser } from '@/lib/session';
import { logDatabaseChange } from '@/lib/audit-logger';

// Helper to parse ISO strings back to Date objects for Prisma
function parseDates(items: any[] | undefined) {
  if (!items || !Array.isArray(items)) return [];
  return items.map(item => {
    const parsed = { ...item };
    for (const key in parsed) {
      if (typeof parsed[key] === 'string') {
        // Match ISO datetime format (e.g. 2026-07-02T13:58:06.000Z)
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(parsed[key])) {
          parsed[key] = new Date(parsed[key]);
        }
      }
    }
    return parsed;
  });
}

// GET: Export entire database to JSON
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (user.role !== 'SUPER_ADMIN') {
      return errorResponse('Forbidden: Super Admin access required', 403);
    }

    const [
      company,
      department,
      position,
      contractType,
      permission,
      shiten,
      holiday,
      announcement,
      reminderTemplate,
      payrollRateConfig,
      payrollRateCheckLog,
      employee,
      employeeContract,
      dependent,
      education,
      certification,
      residenceCardHistory,
      attendanceRecord,
      payrollRecord,
      salaryAdjustment,
      shiftAssignment,
      shiftAvailability,
      overtimeRequest,
      leaveRequest,
      rolePermission,
    ] = await Promise.all([
      prisma.company.findMany(),
      prisma.department.findMany(),
      prisma.position.findMany(),
      prisma.contractType.findMany(),
      prisma.permission.findMany(),
      prisma.shiten.findMany(),
      prisma.holiday.findMany(),
      prisma.announcement.findMany(),
      prisma.reminderTemplate.findMany(),
      prisma.payrollRateConfig.findMany(),
      prisma.payrollRateCheckLog.findMany(),
      prisma.employee.findMany(),
      prisma.employeeContract.findMany(),
      prisma.dependent.findMany(),
      prisma.education.findMany(),
      prisma.certification.findMany(),
      prisma.residenceCardHistory.findMany(),
      prisma.attendanceRecord.findMany(),
      prisma.payrollRecord.findMany(),
      prisma.salaryAdjustment.findMany(),
      prisma.shiftAssignment.findMany(),
      prisma.shiftAvailability.findMany(),
      prisma.overtimeRequest.findMany(),
      prisma.leaveRequest.findMany(),
      prisma.rolePermission.findMany(),
    ]);

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      company,
      department,
      position,
      contractType,
      permission,
      shiten,
      holiday,
      announcement,
      reminderTemplate,
      payrollRateConfig,
      payrollRateCheckLog,
      employee,
      employeeContract,
      dependent,
      education,
      certification,
      residenceCardHistory,
      attendanceRecord,
      payrollRecord,
      salaryAdjustment,
      shiftAssignment,
      shiftAvailability,
      overtimeRequest,
      leaveRequest,
      rolePermission,
    };

    return new Response(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=bawui_hr_backup_${new Date().toISOString().slice(0, 10)}.json`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: Restore/Import JSON backup to database
export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (user.role !== 'SUPER_ADMIN') {
      return errorResponse('Forbidden: Super Admin access required', 403);
    }

    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid backup format', 400);
    }

    // 1. Truncate all tables first (CASCADE takes care of foreign keys in safe order)
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE 
        "companies", "departments", "positions", "contract_types", "permissions", "shitens", "holidays", 
        "announcements", "reminder_templates", "payroll_rate_configs", "payroll_rate_check_logs", 
        "employees", "employee_contracts", "dependents", "education_records", "certifications", 
        "residence_card_history", "attendance_records", "payroll_records", "salary_adjustments", 
        "shift_assignments", "shift_availabilities", "overtime_requests", "leave_requests", 
        "role_permissions" 
      CASCADE;
    `);

    // 2. Insert records inside a single transaction
    await prisma.$transaction(async (tx) => {
      // Parents / independent tables first
      if (body.company?.length) await tx.company.createMany({ data: parseDates(body.company) });
      if (body.department?.length) await tx.department.createMany({ data: parseDates(body.department) });
      if (body.position?.length) await tx.position.createMany({ data: parseDates(body.position) });
      if (body.contractType?.length) await tx.contractType.createMany({ data: parseDates(body.contractType) });
      if (body.permission?.length) await tx.permission.createMany({ data: parseDates(body.permission) });
      if (body.shiten?.length) await tx.shiten.createMany({ data: parseDates(body.shiten) });
      if (body.holiday?.length) await tx.holiday.createMany({ data: parseDates(body.holiday) });
      if (body.announcement?.length) await tx.announcement.createMany({ data: parseDates(body.announcement) });
      if (body.reminderTemplate?.length) await tx.reminderTemplate.createMany({ data: parseDates(body.reminderTemplate) });
      if (body.payrollRateConfig?.length) await tx.payrollRateConfig.createMany({ data: parseDates(body.payrollRateConfig) });

      // Dependent tables next
      if (body.payrollRateCheckLog?.length) await tx.payrollRateCheckLog.createMany({ data: parseDates(body.payrollRateCheckLog) });
      if (body.employee?.length) await tx.employee.createMany({ data: parseDates(body.employee) });
      if (body.employeeContract?.length) await tx.employeeContract.createMany({ data: parseDates(body.employeeContract) });
      if (body.dependent?.length) await tx.dependent.createMany({ data: parseDates(body.dependent) });
      if (body.education?.length) await tx.education.createMany({ data: parseDates(body.education) });
      if (body.certification?.length) await tx.certification.createMany({ data: parseDates(body.certification) });
      if (body.residenceCardHistory?.length) await tx.residenceCardHistory.createMany({ data: parseDates(body.residenceCardHistory) });
      if (body.attendanceRecord?.length) await tx.attendanceRecord.createMany({ data: parseDates(body.attendanceRecord) });
      if (body.payrollRecord?.length) await tx.payrollRecord.createMany({ data: parseDates(body.payrollRecord) });
      if (body.salaryAdjustment?.length) await tx.salaryAdjustment.createMany({ data: parseDates(body.salaryAdjustment) });
      if (body.shiftAssignment?.length) await tx.shiftAssignment.createMany({ data: parseDates(body.shiftAssignment) });
      if (body.shiftAvailability?.length) await tx.shiftAvailability.createMany({ data: parseDates(body.shiftAvailability) });
      if (body.overtimeRequest?.length) await tx.overtimeRequest.createMany({ data: parseDates(body.overtimeRequest) });
      if (body.leaveRequest?.length) await tx.leaveRequest.createMany({ data: parseDates(body.leaveRequest) });
      if (body.rolePermission?.length) await tx.rolePermission.createMany({ data: parseDates(body.rolePermission) });
    });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'Company',
      recordId: 'BACKUP_RESTORE',
      details: {
        message: 'Full system database restore from JSON backup file completed.',
        timestamp: body.timestamp || 'N/A',
      },
    });

    return createdResponse({ success: true, message: 'Database successfully restored from JSON backup.' });
  } catch (error) {
    return handleApiError(error);
  }
}
