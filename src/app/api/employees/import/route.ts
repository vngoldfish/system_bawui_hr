import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createEmployeeSchema } from '@/lib/validations/employee';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';
import { hashPassword } from '@/lib/crypto';
import { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // 1. Authorize: Only SUPER_ADMIN and HR_MANAGER are allowed
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    // 2. Parse body
    const body = await request.json();
    const { employees } = body;

    if (!employees || !Array.isArray(employees)) {
      return errorResponse('JSONデータは「employees」配列を含むオブジェクトである必要があります。 (JSON data must contain an "employees" array)', 400);
    }

    if (employees.length === 0) {
      return errorResponse('インポートする従業員データがありません。 (No employee data to import)', 400);
    }

    // 3. Fetch all metadata for lookup
    const [departments, positions, contractTypes, existingDbEmployees] = await Promise.all([
      prisma.department.findMany({ select: { id: true, name: true } }),
      prisma.position.findMany({ select: { id: true, name: true } }),
      prisma.contractType.findMany({ select: { id: true, name: true } }),
      prisma.employee.findMany({ select: { email: true, employeeCode: true } }),
    ]);

    // Build lookup maps (lowercase, trimmed keys)
    const deptMap = new Map(departments.map(d => [d.name.toLowerCase().trim(), d.id]));
    const posMap = new Map(positions.map(p => [p.name.toLowerCase().trim(), p.id]));
    const ctMap = new Map(contractTypes.map(c => [c.name.toLowerCase().trim(), c.id]));

    const deptIdSet = new Set(departments.map(d => d.id));
    const posIdSet = new Set(positions.map(p => p.id));
    const ctIdSet = new Set(contractTypes.map(c => c.id));

    // Tracking sets for duplicates
    const dbEmails = new Set(existingDbEmployees.map(e => e.email.toLowerCase().trim()));
    const dbCodes = new Set(existingDbEmployees.map(e => e.employeeCode.toLowerCase().trim()));

    const importedEmails = new Set<string>();
    const importedCodes = new Set<string>();

    // Determine the starting auto-increment value for employeeCode
    let lastEmployee = await prisma.employee.findFirst({
      where: { employeeCode: { startsWith: 'NV' } },
      orderBy: { employeeCode: 'desc' },
      select: { employeeCode: true },
    });
    let nextAutoCodeNum = 1;
    if (lastEmployee) {
      const match = lastEmployee.employeeCode.match(/NV(\d+)/);
      if (match) {
        nextAutoCodeNum = parseInt(match[1], 10) + 1;
      }
    }

    const errors: string[] = [];
    const validatedEmployees: any[] = [];

    // Helper to generate code while avoiding conflicts
    const generateCode = (): string => {
      let code = `NV${String(nextAutoCodeNum++).padStart(3, '0')}`;
      while (dbCodes.has(code.toLowerCase()) || importedCodes.has(code.toLowerCase())) {
        code = `NV${String(nextAutoCodeNum++).padStart(3, '0')}`;
      }
      return code;
    };

    // 4. Validate all rows
    for (let i = 0; i < employees.length; i++) {
      const rowNum = i + 1;
      const emp = employees[i];

      if (!emp || typeof emp !== 'object') {
        errors.push(`行 ${rowNum}: データオブジェクトが無効です (Invalid data object)`);
        continue;
      }

      // Check required names and emails
      const firstName = emp.firstName?.trim();
      const lastName = emp.lastName?.trim();
      const firstNameKana = emp.firstNameKana?.trim();
      const lastNameKana = emp.lastNameKana?.trim();
      const email = emp.email?.trim().toLowerCase();
      const phone = emp.phone?.trim();
      const hireDate = emp.hireDate?.trim();
      const salary = Number(emp.salary);

      const rowDetails: string[] = [];

      if (!lastName) rowDetails.push('姓は必須です (Last name is required)');
      if (!firstName) rowDetails.push('名は必須です (First name is required)');
      if (!lastNameKana) rowDetails.push('姓（カナ）は必須です (Last name Kana is required)');
      if (!firstNameKana) rowDetails.push('名（カナ）は必須です (First name Kana is required)');
      if (!email) rowDetails.push('メールアドレスは必須です (Email is required)');
      if (!phone) rowDetails.push('電話番号は必須です (Phone number is required)');
      if (!hireDate || isNaN(Date.parse(hireDate))) rowDetails.push('有効な入社日は必須です (Valid hire date is required)');
      if (isNaN(salary) || salary < 0) rowDetails.push('給与は0以上である必要があります (Salary must be >= 0)');

      // Validate email format
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowDetails.push('有効なメールアドレスを入力してください (Invalid email format)');
      }

      // Check email duplicate in DB or current import batch
      if (email) {
        if (dbEmails.has(email)) {
          rowDetails.push(`メールアドレス「${email}」は既に使用されています (Email already registered)`);
        } else if (importedEmails.has(email)) {
          rowDetails.push(`インポートデータ内でメールアドレス「${email}」が重複しています (Email duplicate in import)`);
        } else {
          importedEmails.add(email);
        }
      }

      // Resolve departmentId (strictly ID-based)
      const departmentId = emp.departmentId?.trim();
      if (!departmentId) {
        rowDetails.push('部署ID (departmentId) が必要です (Department ID is required)');
      } else if (!deptIdSet.has(departmentId)) {
        rowDetails.push(`部署ID「${departmentId}」が見つかりません (Department ID not found)`);
      }

      // Resolve positionId (strictly ID-based)
      const positionId = emp.positionId?.trim();
      if (!positionId) {
        rowDetails.push('役職ID (positionId) が必要です (Position ID is required)');
      } else if (!posIdSet.has(positionId)) {
        rowDetails.push(`役職ID「${positionId}」が見つかりません (Position ID not found)`);
      }

      // Resolve contractTypeId (strictly ID-based)
      const contractTypeId = emp.contractTypeId?.trim();
      if (!contractTypeId) {
        rowDetails.push('雇用形態ID (contractTypeId) が必要です (Contract Type ID is required)');
      } else if (!ctIdSet.has(contractTypeId)) {
        rowDetails.push(`雇用形態ID「${contractTypeId}」が見つかりません (Contract Type ID not found)`);
      }

      // Validate employeeCode
      let employeeCode = emp.employeeCode?.trim();
      if (employeeCode) {
        const lowerCode = employeeCode.toLowerCase();
        if (dbCodes.has(lowerCode)) {
          rowDetails.push(`従業員コード「${employeeCode}」は既に登録されています (Employee code already exists)`);
        } else if (importedCodes.has(lowerCode)) {
          rowDetails.push(`インポートデータ内で従業員コード「${employeeCode}」が重複しています (Employee code duplicate in import)`);
        } else {
          importedCodes.add(lowerCode);
        }
      } else {
        // Auto-generate employeeCode and register it to avoid duplicate generations in this batch
        employeeCode = generateCode();
        importedCodes.add(employeeCode.toLowerCase());
      }

      // Validate birthDate and dates
      const birthDate = emp.birthDate?.trim();
      if (birthDate && isNaN(Date.parse(birthDate))) {
        rowDetails.push('生年月日の形式が不正です (Invalid birth date format)');
      }

      const residenceExpiry = emp.residenceExpiry?.trim();
      if (residenceExpiry && isNaN(Date.parse(residenceExpiry))) {
        rowDetails.push('在留期限の形式が不正です (Invalid residence expiry format)');
      }

      if (rowDetails.length > 0) {
        errors.push(`行 ${rowNum}: ${rowDetails.join(', ')}`);
      } else {
        // Format birthDate password YYYYMMDD or default '123456'
        const rawBirthDate = birthDate ? new Date(birthDate) : null;
        const passwordSuffix = birthDate ? birthDate.replace(/-/g, '') : '123456';
        const password = emp.password || (employeeCode + passwordSuffix);
        const hashedPassword = hashPassword(password);

        validatedEmployees.push({
          employeeCode,
          firstName,
          lastName,
          firstNameKana,
          lastNameKana,
          email,
          phone,
          birthDate: rawBirthDate,
          departmentId,
          positionId,
          contractTypeId,
          hireDate: new Date(hireDate),
          salary,
          salaryType: emp.salaryType || '月給',
          status: emp.status || 'ACTIVE',
          nationality: emp.nationality || '日本',
          residenceStatus: emp.residenceStatus || null,
          residenceCardNumber: emp.residenceCardNumber || null,
          residenceExpiry: residenceExpiry ? new Date(residenceExpiry) : null,
          role: emp.role || 'EMPLOYEE',
          password: hashedPassword,
          benefits: emp.benefits || {
            healthInsurance: true,
            pension: true,
            employmentInsurance: true,
            workersComp: true,
            transportation: 0,
            housing: 0,
            meal: 0,
          },
        });
      }
    }

    // 5. Return errors if any validation failed
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: '検証エラーが発生しました。 (Validation failed)',
        details: errors,
      }, { status: 400 });
    }

    // 6. Execute bulk transaction
    await prisma.$transaction(async (tx) => {
      for (const empData of validatedEmployees) {
        const { departmentId, positionId, contractTypeId, ...dbData } = empData;
        const employee = await tx.employee.create({
          data: {
            ...dbData,
            department: { connect: { id: departmentId } },
            position: { connect: { id: positionId } },
            contractType: { connect: { id: contractTypeId } },
            employeeContracts: {
              create: {
                contractTypeId,
                name: `${dbData.lastName} ${dbData.firstName} 勤務契約`,
                startDate: dbData.hireDate,
                workDays: [1, 2, 3, 4, 5],
                standardHoursPerDay: 8,
                defaultCheckIn: '08:00',
                defaultCheckOut: '17:00',
                defaultBreakStart: '12:00',
                defaultBreakEnd: '13:00',
                holidayWorkCountsAsOvertime: true,
                isActive: true,
              }
            }
          }
        });

        // Audit log database change
        logDatabaseChange({
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
            importSource: 'BULK_JSON_IMPORT'
          },
          user // User initiating the import
        });
      }
    });

    return successResponse({
      message: `${validatedEmployees.length}名の従業員を正常にインポートしました。 (Successfully imported ${validatedEmployees.length} employees)`,
      count: validatedEmployees.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
