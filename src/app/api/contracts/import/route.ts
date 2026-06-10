import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';

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
    const { contracts } = body;

    if (!contracts || !Array.isArray(contracts)) {
      return errorResponse('JSON data must contain a "contracts" array.', 400);
    }

    if (contracts.length === 0) {
      return errorResponse('No contract data to import.', 400);
    }

    // Fetch meta data for lookup
    const [employees, contractTypes] = await Promise.all([
      prisma.employee.findMany({ select: { id: true, email: true, employeeCode: true } }),
      prisma.contractType.findMany({ select: { id: true, name: true } }),
    ]);

    // Build lookup maps
    const empByCode = new Map(employees.map(e => [e.employeeCode.toLowerCase().trim(), e.id]));
    const empByEmail = new Map(employees.map(e => [e.email.toLowerCase().trim(), e.id]));
    const ctMap = new Map(contractTypes.map(c => [c.name.toLowerCase().trim(), c.id]));

    const errors: string[] = [];
    const validatedContracts: any[] = [];

    for (let i = 0; i < contracts.length; i++) {
      const rowNum = i + 1;
      const contract = contracts[i];

      if (!contract || typeof contract !== 'object') {
        errors.push(`Row ${rowNum}: Invalid data object`);
        continue;
      }

      const employeeCode = contract.employeeCode?.trim();
      const employeeEmail = contract.employeeEmail?.trim().toLowerCase();
      const contractTypeName = contract.contractType?.trim().toLowerCase();
      const name = contract.name?.trim();
      const startDate = contract.startDate?.trim();
      const endDate = contract.endDate?.trim() || null;
      const standardHoursPerDay = Number(contract.standardHoursPerDay ?? 8);
      const notes = contract.notes?.trim() || '';

      const rowDetails: string[] = [];

      // Resolve employeeId
      let employeeId = '';
      if (employeeCode) {
        employeeId = empByCode.get(employeeCode.toLowerCase()) || '';
      } else if (employeeEmail) {
        employeeId = empByEmail.get(employeeEmail) || '';
      }

      if (!employeeId) {
        rowDetails.push('Employee not found (must provide valid employeeCode or employeeEmail)');
      }

      // Resolve contractTypeId
      let contractTypeId = '';
      if (contractTypeName) {
        contractTypeId = ctMap.get(contractTypeName) || '';
      }

      if (!contractTypeId) {
        rowDetails.push(`Contract Type "${contract.contractType}" not found`);
      }

      if (!name) rowDetails.push('Contract Name is required');
      if (!startDate || isNaN(Date.parse(startDate))) {
        rowDetails.push('Valid Start Date is required (YYYY-MM-DD)');
      }
      if (endDate && isNaN(Date.parse(endDate))) {
        rowDetails.push('End Date format is invalid (YYYY-MM-DD)');
      }
      if (isNaN(standardHoursPerDay) || standardHoursPerDay <= 0) {
        rowDetails.push('standardHoursPerDay must be a positive number');
      }

      if (rowDetails.length > 0) {
        errors.push(`Row ${rowNum}: ${rowDetails.join(', ')}`);
      } else {
        validatedContracts.push({
          employeeId,
          contractTypeId,
          name,
          startDate: new Date(startDate!),
          endDate: endDate ? new Date(endDate) : null,
          standardHoursPerDay,
          defaultCheckIn: contract.defaultCheckIn || '08:00',
          defaultCheckOut: contract.defaultCheckOut || '17:00',
          defaultBreakStart: contract.defaultBreakStart || '12:00',
          defaultBreakEnd: contract.defaultBreakEnd || '13:00',
          holidayWorkCountsAsOvertime: contract.holidayWorkCountsAsOvertime !== false,
          isActive: contract.isActive !== false,
          notes,
          workDays: contract.workDays || [1, 2, 3, 4, 5],
        });
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: errors,
      }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const contractData of validatedContracts) {
        // If isActive is true, set all other contracts of this employee to inactive
        if (contractData.isActive) {
          await tx.employeeContract.updateMany({
            where: { employeeId: contractData.employeeId, isActive: true },
            data: { isActive: false },
          });
        }

        const contract = await tx.employeeContract.create({
          data: contractData,
        });

        logDatabaseChange({
          action: 'CREATE',
          model: 'EmployeeContract',
          recordId: contract.id,
          details: { name: contract.name, employeeId: contract.employeeId, importSource: 'BULK_JSON_IMPORT' },
          user,
        });
      }
    });

    return successResponse({
      message: `Successfully imported ${validatedContracts.length} contracts.`,
      count: validatedContracts.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
