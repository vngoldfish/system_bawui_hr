import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createEmployeeSchema, employeeQuerySchema } from '@/lib/validations/employee';
import { successResponse, createdResponse, errorResponse, handleApiError, parsePagination, buildMeta } from '@/lib/api-utils';
import { syncEmployeeSalaries } from '@/lib/payroll-calculator';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';
import { Prisma } from '@prisma/client';
import { hashPassword } from '@/lib/crypto';

const employeeInclude = {
  department: true,
  position: true,
  contractType: true,
  dependents: true,
  education: true,
  certifications: true,
  residenceCardHistory: true,
  shitens: true,
  salaryAdjustments: {
    orderBy: { effectiveFrom: 'desc' as const },
  },
} satisfies Prisma.EmployeeInclude;

// GET all employees with pagination, search, filter
export async function GET(request: NextRequest) {
  try {
    await syncEmployeeSalaries(prisma);
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const { searchParams } = request.nextUrl;
    const query = employeeQuerySchema.parse(Object.fromEntries(searchParams));
    const { skip, take, page, limit } = parsePagination(searchParams);

    const where: Prisma.EmployeeWhereInput = {};

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { firstNameKana: { contains: query.search, mode: 'insensitive' } },
        { lastNameKana: { contains: query.search, mode: 'insensitive' } },
        { employeeCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: employeeInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.employee.count({ where }),
    ]);

    return successResponse({
      data: employees,
      meta: buildMeta(total, page, limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Generate next employee code
async function generateEmployeeCode(): Promise<string> {
  const lastEmployee = await prisma.employee.findFirst({
    where: { employeeCode: { startsWith: 'NV' } },
    orderBy: { employeeCode: 'desc' },
    select: { employeeCode: true },
  });

  if (!lastEmployee) return 'NV001';

  const lastNum = parseInt(lastEmployee.employeeCode.replace('NV', ''), 10);
  const nextNum = lastNum + 1;
  return `NV${String(nextNum).padStart(3, '0')}`;
}

// POST new employee
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
    const data = createEmployeeSchema.parse(body);

    const {
      dependents,
      education,
      certifications,
      shitenIds,
      employeeCode: inputCode,
      contractTypeId,
      departmentId,
      positionId,
      workDays,
      standardHoursPerDay,
      defaultCheckIn,
      defaultCheckOut,
      defaultBreakStart,
      defaultBreakEnd,
      holidayWorkCountsAsOvertime,
      ...employeeData
    } = data;

    // Auto-generate employeeCode if not provided
    let employeeCode = inputCode?.trim() || '';
    if (!employeeCode) {
      employeeCode = await generateEmployeeCode();
    } else {
      // Check uniqueness
      const existing = await prisma.employee.findUnique({ where: { employeeCode } });
      if (existing) {
        return handleApiError(new Error(`従業員コード「${employeeCode}」は既に使用されています`));
      }
    }

    const role = employeeData.role || 'EMPLOYEE';
    let password = employeeData.password;
    if (!password) {
      password = employeeCode + (employeeData.birthDate ? employeeData.birthDate.replace(/-/g, '') : '123456');
    }
    const hashedPassword = hashPassword(password);

    // Remove role and password from employeeData to pass cleanly
    const { role: _, password: __, ...cleanedEmployeeData } = employeeData;

    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        ...cleanedEmployeeData,
        role,
        password: hashedPassword,
        department: { connect: { id: departmentId } },
        position: { connect: { id: positionId } },
        contractType: { connect: { id: contractTypeId } },
        ...(shitenIds && shitenIds.length > 0 && {
          shitens: {
            connect: shitenIds.map((sid: string) => ({ id: sid })),
          },
        }),
        hireDate: new Date(employeeData.hireDate),
        birthDate: employeeData.birthDate ? new Date(employeeData.birthDate) : null,
        residenceCardIssueDate: employeeData.residenceCardIssueDate ? new Date(employeeData.residenceCardIssueDate) : null,
        residenceExpiry: employeeData.residenceExpiry ? new Date(employeeData.residenceExpiry) : null,
        contractStartDate: employeeData.contractStartDate ? new Date(employeeData.contractStartDate) : null,
        contractEndDate: employeeData.contractEndDate ? new Date(employeeData.contractEndDate) : null,
        benefits: employeeData.benefits ?? undefined,
        dependents: {
          create: dependents.map(d => ({
            ...d,
            birthDate: d.birthDate ? new Date(d.birthDate) : null,
          })),
        },
        education: {
          create: education,
        },
        certifications: {
          create: certifications.map(c => ({
            ...c,
            acquiredDate: c.acquiredDate ? new Date(c.acquiredDate) : null,
            expiryDate: c.expiryDate ? new Date(c.expiryDate) : null,
          })),
        },
        employeeContracts: {
          create: {
            contractTypeId,
            name: `${employeeData.lastName} ${employeeData.firstName} 勤務契約`,
            startDate: employeeData.contractStartDate ? new Date(employeeData.contractStartDate) : new Date(employeeData.hireDate),
            endDate: employeeData.contractEndDate ? new Date(employeeData.contractEndDate) : null,
            workDays: (workDays ?? [1, 2, 3, 4, 5]) as any,
            standardHoursPerDay: standardHoursPerDay ?? 8,
            defaultCheckIn: defaultCheckIn ?? '08:00',
            defaultCheckOut: defaultCheckOut ?? '17:00',
            defaultBreakStart: defaultBreakStart ?? '12:00',
            defaultBreakEnd: defaultBreakEnd ?? '13:00',
            holidayWorkCountsAsOvertime: holidayWorkCountsAsOvertime ?? true,
            isActive: true,
          }
        },
      },
      include: employeeInclude,
    });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'Employee',
      recordId: employee.id,
      details: {
        employeeCode: employee.employeeCode,
        email: employee.email,
        lastName: employee.lastName,
        firstName: employee.firstName,
        role: employee.role,
        departmentId: employee.departmentId,
        positionId: employee.positionId,
      },
    });

    return createdResponse(employee);
  } catch (error) {
    return handleApiError(error);
  }
}
