import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createEmployeeSchema } from '@/lib/validations/employee';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';
import { hashPassword } from '@/lib/crypto';
import { Prisma } from '@prisma/client';

function getCleanValue(val: any): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === '' || s === '-' || s === 'undefined' || s === 'null') return null;
  return s;
}

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

      // Check required name fields
      const lastName = getCleanValue(emp.lastName);
      const firstName = getCleanValue(emp.firstName);

      if (!lastName || !firstName) {
        if (!lastName) errors.push(`行 ${rowNum}: 姓は必須です (Last name is required)`);
        if (!firstName) errors.push(`行 ${rowNum}: 名は必須です (First name is required)`);
        continue;
      }

      // Resolve employeeCode first to use in email generation
      let employeeCode = getCleanValue(emp.employeeCode);
      if (employeeCode) {
        const lowerCode = employeeCode.toLowerCase();
        if (dbCodes.has(lowerCode) || importedCodes.has(lowerCode)) {
          errors.push(`行 ${rowNum}: 従業員コード「${employeeCode}」は既に登録されているか重複しています (Employee code exists/duplicate)`);
          continue;
        }
        importedCodes.add(lowerCode);
      } else {
        employeeCode = generateCode();
        importedCodes.add(employeeCode.toLowerCase());
      }

      // Default values for optional fields
      const lastNameKana = getCleanValue(emp.lastNameKana) || "-";
      const firstNameKana = getCleanValue(emp.firstNameKana) || "-";
      const phone = getCleanValue(emp.phone) || "000-0000-0000";
      
      let email = getCleanValue(emp.email)?.toLowerCase();
      if (!email) {
        // Safe auto-generated email: e.g. nguyenvantuan.nv001@company.com
        const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
        email = `${cleanLast}${cleanFirst}.${employeeCode.toLowerCase()}@company.com`;
      }

      // Validate email format and check duplicate
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`行 ${rowNum}: 有効なメールアドレスを入力してください (Invalid email format: ${email})`);
        continue;
      }
      if (dbEmails.has(email) || importedEmails.has(email)) {
        errors.push(`行 ${rowNum}: メールアドレス「${email}」は既に使用されているか重複しています (Email exists/duplicate)`);
        continue;
      }
      importedEmails.add(email);

      const rawHireDateStr = getCleanValue(emp.hireDate) || new Date().toISOString().split('T')[0];
      if (isNaN(Date.parse(rawHireDateStr))) {
        errors.push(`行 ${rowNum}: 入社日「${rawHireDateStr}」の形式が不正です (Invalid hire date format)`);
        continue;
      }
      const hireDate = new Date(rawHireDateStr);

      const salaryVal = getCleanValue(emp.salary);
      const salary = salaryVal !== null ? Number(salaryVal) : 280000;
      if (isNaN(salary) || salary < 0) {
        errors.push(`行 ${rowNum}: 給与は0以上である必要があります (Salary must be >= 0)`);
        continue;
      }

      // Resolve departmentId (ID-based, name-based lookup, or fallback to first department)
      let departmentId = getCleanValue(emp.departmentId);
      const deptNameClean = getCleanValue(emp.department);
      if (!departmentId && deptNameClean) {
        departmentId = deptMap.get(deptNameClean.toLowerCase()) || null;
      }
      if (!departmentId) {
        if (departments.length > 0) {
          departmentId = departments[0].id;
        } else {
          errors.push(`行 ${rowNum}: 部署 (departmentId/department) が指定されておらず、デフォルト値もありません (No departments in DB)`);
          continue;
        }
      } else if (!deptIdSet.has(departmentId)) {
        errors.push(`行 ${rowNum}: 部署「${departmentId}」が見つかりません (Department not found)`);
        continue;
      }

      // Resolve positionId (ID-based, name-based lookup, or fallback to first position)
      let positionId = getCleanValue(emp.positionId);
      const posNameClean = getCleanValue(emp.position);
      if (!positionId && posNameClean) {
        positionId = posMap.get(posNameClean.toLowerCase()) || null;
      }
      if (!positionId) {
        if (positions.length > 0) {
          positionId = positions[0].id;
        } else {
          errors.push(`行 ${rowNum}: 役職 (positionId/position) が指定されておらず、デフォルト値もありません (No positions in DB)`);
          continue;
        }
      } else if (!posIdSet.has(positionId)) {
        errors.push(`行 ${rowNum}: 役職「${positionId}」が見つかりません (Position not found)`);
        continue;
      }

      // Resolve contractTypeId (ID-based, name-based lookup, or fallback to first contract type)
      let contractTypeId = getCleanValue(emp.contractTypeId);
      const ctNameClean = getCleanValue(emp.contractType);
      if (!contractTypeId && ctNameClean) {
        contractTypeId = ctMap.get(ctNameClean.toLowerCase()) || null;
      }
      if (!contractTypeId) {
        if (contractTypes.length > 0) {
          contractTypeId = contractTypes[0].id;
        } else {
          errors.push(`行 ${rowNum}: 雇用形態 (contractTypeId/contractType) が指定されておらず、デフォルト値もありません (No contract types in DB)`);
          continue;
        }
      } else if (!ctIdSet.has(contractTypeId)) {
        errors.push(`行 ${rowNum}: 雇用形態「${contractTypeId}」が見つかりません (Contract Type not found)`);
        continue;
      }

      // Parse other optional dates
      const birthDateStr = getCleanValue(emp.birthDate);
      if (birthDateStr && isNaN(Date.parse(birthDateStr))) {
        errors.push(`行 ${rowNum}: 生年月日「${birthDateStr}」の形式が不正です (Invalid birth date format)`);
        continue;
      }
      const birthDate = birthDateStr ? new Date(birthDateStr) : null;

      const residenceExpiryStr = getCleanValue(emp.residenceExpiry);
      if (residenceExpiryStr && isNaN(Date.parse(residenceExpiryStr))) {
        errors.push(`行 ${rowNum}: 在留期限「${residenceExpiryStr}」の形式が不正です (Invalid residence expiry format)`);
        continue;
      }
      const residenceExpiry = residenceExpiryStr ? new Date(residenceExpiryStr) : null;

      const residenceCardIssueDateStr = getCleanValue(emp.residenceCardIssueDate);
      if (residenceCardIssueDateStr && isNaN(Date.parse(residenceCardIssueDateStr))) {
        errors.push(`行 ${rowNum}: 在留カード交付日「${residenceCardIssueDateStr}」の形式が不正です (Invalid residence card issue date format)`);
        continue;
      }
      const residenceCardIssueDate = residenceCardIssueDateStr ? new Date(residenceCardIssueDateStr) : null;

      const contractStartDateStr = getCleanValue(emp.contractStartDate);
      if (contractStartDateStr && isNaN(Date.parse(contractStartDateStr))) {
        errors.push(`行 ${rowNum}: 契約開始日「${contractStartDateStr}」の形式が不正です (Invalid contract start date format)`);
        continue;
      }
      const contractStartDate = contractStartDateStr ? new Date(contractStartDateStr) : hireDate;

      const contractEndDateStr = getCleanValue(emp.contractEndDate);
      if (contractEndDateStr && isNaN(Date.parse(contractEndDateStr))) {
        errors.push(`行 ${rowNum}: 契約終了日「${contractEndDateStr}」の形式が不正です (Invalid contract end date format)`);
        continue;
      }
      const contractEndDate = contractEndDateStr ? new Date(contractEndDateStr) : null;

      // Hash password
      const passwordSuffix = birthDateStr ? birthDateStr.replace(/-/g, '') : '123456';
      const password = emp.password || (employeeCode + passwordSuffix);
      const hashedPassword = hashPassword(password);

      // Map all extra database columns
      validatedEmployees.push({
        employeeCode,
        firstName,
        lastName,
        firstNameKana,
        lastNameKana,
        email,
        phone,
        birthDate,
        departmentId,
        positionId,
        contractTypeId,
        hireDate,
        salary,
        salaryType: getCleanValue(emp.salaryType) || '月給',
        status: getCleanValue(emp.status) || 'ACTIVE',
        nationality: getCleanValue(emp.nationality) || '日本',
        residenceStatus: getCleanValue(emp.residenceStatus),
        residenceCardNumber: getCleanValue(emp.residenceCardNumber),
        residenceCardIssueDate,
        residenceExpiry,
        role: getCleanValue(emp.role) || 'EMPLOYEE',
        password: hashedPassword,
        address: getCleanValue(emp.address) || '',
        avatar: getCleanValue(emp.avatar) || '',
        language: getCleanValue(emp.language) || 'ja',
        workRestriction: getCleanValue(emp.workRestriction),
        residenceCardImage: getCleanValue(emp.residenceCardImage),
        contractStartDate,
        contractEndDate,
        contractEndDateType: getCleanValue(emp.contractEndDateType) || 'none',
        hourlyRate: emp.hourlyRate !== undefined && getCleanValue(emp.hourlyRate) !== null ? Number(emp.hourlyRate) : 0,
        dailyRate: emp.dailyRate !== undefined && getCleanValue(emp.dailyRate) !== null ? Number(emp.dailyRate) : 0,
        baseSalaryAtHire: emp.baseSalaryAtHire !== undefined && getCleanValue(emp.baseSalaryAtHire) !== null ? Number(emp.baseSalaryAtHire) : salary,
        insuranceSalary: emp.insuranceSalary !== undefined && getCleanValue(emp.insuranceSalary) !== null ? Number(emp.insuranceSalary) : null,
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
