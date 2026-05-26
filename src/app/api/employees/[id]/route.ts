import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateEmployeeSchema } from '@/lib/validations/employee';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
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
} satisfies Prisma.EmployeeInclude;

// GET single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    
    // Regular employees can only view their own details
    if (user.role === 'EMPLOYEE' && user.id !== id) {
      return errorResponse('Forbidden', 403);
    }
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: employeeInclude,
    });

    if (!employee) {
      return errorResponse('従業員が見つかりません', 404);
    }

    return successResponse(employee);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateEmployeeSchema.parse(body);

    // Check employee exists
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('従業員が見つかりません', 404);
    }

    const { dependents, education, certifications, contractTypeId, ...employeeData } = data;

    // Build update data with date conversions
    const updateData: Prisma.EmployeeUpdateInput = {};
    if (employeeData.firstName !== undefined) updateData.firstName = employeeData.firstName;
    if (employeeData.lastName !== undefined) updateData.lastName = employeeData.lastName;
    if (employeeData.firstNameKana !== undefined) updateData.firstNameKana = employeeData.firstNameKana;
    if (employeeData.lastNameKana !== undefined) updateData.lastNameKana = employeeData.lastNameKana;
    if (employeeData.email !== undefined) updateData.email = employeeData.email;
    if (employeeData.phone !== undefined) updateData.phone = employeeData.phone;
    if (employeeData.birthDate !== undefined) updateData.birthDate = employeeData.birthDate ? new Date(employeeData.birthDate) : null;
    if (employeeData.avatar !== undefined) updateData.avatar = employeeData.avatar;
    if (employeeData.departmentId !== undefined) updateData.department = { connect: { id: employeeData.departmentId } };
    if (employeeData.positionId !== undefined) updateData.position = { connect: { id: employeeData.positionId } };
    if (employeeData.hireDate !== undefined) updateData.hireDate = new Date(employeeData.hireDate);
    if (employeeData.salary !== undefined) updateData.salary = employeeData.salary;
    if (employeeData.status !== undefined) updateData.status = employeeData.status;
    if (employeeData.nationality !== undefined) updateData.nationality = employeeData.nationality;
    if (employeeData.residenceStatus !== undefined) updateData.residenceStatus = employeeData.residenceStatus;
    if (employeeData.residenceCardNumber !== undefined) updateData.residenceCardNumber = employeeData.residenceCardNumber;
    if (employeeData.residenceCardIssueDate !== undefined) updateData.residenceCardIssueDate = employeeData.residenceCardIssueDate ? new Date(employeeData.residenceCardIssueDate) : null;
    if (employeeData.residenceExpiry !== undefined) updateData.residenceExpiry = employeeData.residenceExpiry ? new Date(employeeData.residenceExpiry) : null;
    if (employeeData.workRestriction !== undefined) updateData.workRestriction = employeeData.workRestriction;
    if (contractTypeId !== undefined) updateData.contractType = { connect: { id: contractTypeId } };
    if (employeeData.contractStartDate !== undefined) updateData.contractStartDate = employeeData.contractStartDate ? new Date(employeeData.contractStartDate) : null;
    if (employeeData.contractEndDate !== undefined) updateData.contractEndDate = employeeData.contractEndDate ? new Date(employeeData.contractEndDate) : null;
    if (employeeData.contractEndDateType !== undefined) updateData.contractEndDateType = employeeData.contractEndDateType;
    if (employeeData.salaryType !== undefined) updateData.salaryType = employeeData.salaryType;
    if (employeeData.hourlyRate !== undefined) updateData.hourlyRate = employeeData.hourlyRate;
    if (employeeData.dailyRate !== undefined) updateData.dailyRate = employeeData.dailyRate;
    if (employeeData.benefits !== undefined) updateData.benefits = employeeData.benefits ?? undefined;
    if (employeeData.role !== undefined) updateData.role = employeeData.role;
    if (employeeData.password !== undefined && employeeData.password.trim() !== '') {
      updateData.password = hashPassword(employeeData.password);
    }

    // Track residence card history if residence fields changed
    const residenceFields = ['residenceStatus', 'residenceCardNumber', 'residenceCardIssueDate', 'residenceExpiry', 'workRestriction'] as const;
    const residenceChanged = residenceFields.some(f => {
      const newVal = employeeData[f];
      const oldVal = existing[f];
      return newVal !== undefined && (newVal || '') !== (oldVal || '');
    });

    if (residenceChanged && (existing.residenceStatus || existing.residenceCardNumber)) {
      await prisma.residenceCardHistory.create({
        data: {
          employeeId: id,
          residenceStatus: existing.residenceStatus || '',
          residenceCardNumber: existing.residenceCardNumber,
          residenceCardIssueDate: existing.residenceCardIssueDate,
          residenceExpiry: existing.residenceExpiry,
          workRestriction: existing.workRestriction,
        },
      });
    }

    // Update employee with nested operations
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...updateData,
        ...(dependents !== undefined && {
          dependents: {
            deleteMany: {},
            create: dependents.map(d => ({
              ...d,
              birthDate: d.birthDate ? new Date(d.birthDate) : null,
            })),
          },
        }),
        ...(education !== undefined && {
          education: {
            deleteMany: {},
            create: education,
          },
        }),
        ...(certifications !== undefined && {
          certifications: {
            deleteMany: {},
            create: certifications.map(c => ({
              ...c,
              acquiredDate: c.acquiredDate ? new Date(c.acquiredDate) : null,
              expiryDate: c.expiryDate ? new Date(c.expiryDate) : null,
            })),
          },
        }),
      },
      include: employeeInclude,
    });

    logDatabaseChange({
      request,
      action: 'UPDATE',
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
        status: employee.status,
      },
    });

    return successResponse(employee);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const { id } = await params;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('従業員が見つかりません', 404);
    }

    const deletedEmployee = await prisma.employee.delete({ where: { id } });

    logDatabaseChange({
      request,
      action: 'DELETE',
      model: 'Employee',
      recordId: id,
      details: {
        employeeCode: deletedEmployee.employeeCode,
        email: deletedEmployee.email,
        lastName: deletedEmployee.lastName,
        firstName: deletedEmployee.firstName,
      },
    });

    return successResponse({ message: '従業員を削除しました' });
  } catch (error) {
    return handleApiError(error);
  }
}
