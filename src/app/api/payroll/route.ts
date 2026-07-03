import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createdResponse, errorResponse, handleApiError, successResponse } from '@/lib/api-utils';
import { hasPermission } from '@/lib/auth-mock';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';
import { batchGetEffectiveSalaries, calculatePayrollDetails, getEffectiveSalary, syncEmployeeSalaries } from '@/lib/payroll-calculator';
import { resolveContractPayrollRules } from '@/lib/contract-payroll-rules';
import { getActiveRateConfig, toPayrollRateSettings } from '@/services/payrollRateService';

// GET payroll records
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployee = user.role === 'EMPLOYEE' || viewMode === 'employee';

    const { searchParams } = new URL(request.url);
    let employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');

    // Force regular employees to only query their own records
    if (isEmployee) {
      employeeId = user.id;
    }

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month) {
      where.month = month;
    }

    // For regular employees, also restrict to months from hire date to now
    if (isEmployee) {
      const dbUser = await prisma.employee.findUnique({
        where: { id: user.id },
        select: { hireDate: true }
      });
      
      if (dbUser) {
        const hireDate = new Date(dbUser.hireDate);
        const hireYear = hireDate.getFullYear();
        const hireMonth = hireDate.getMonth() + 1;
        const hireMonthStr = `${hireYear}-${String(hireMonth).padStart(2, '0')}`;

        const now = new Date();
        const nowYear = now.getFullYear();
        const nowMonth = now.getMonth() + 1;
        const nowMonthStr = `${nowYear}-${String(nowMonth).padStart(2, '0')}`;

        where.month = {
          ...(where.month && typeof where.month === 'object' ? where.month : {}),
          gte: hireMonthStr,
          lte: nowMonthStr,
        };
      }

      where.status = { in: ['APPROVED', 'PAID'] };
    }

    const records = await prisma.payrollRecord.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: { month: 'desc' },
      take: parseInt(searchParams.get('limit') || '50', 10),
      skip: parseInt(searchParams.get('skip') || '0', 10),
    });

    return successResponse(records);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST new payroll record(s)
export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    if (viewMode === 'employee' || !hasPermission('payroll:edit', user as any)) {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const syncMonth = !Array.isArray(body) && body?.syncMonth ? String(body.syncMonth) : null;
    const isArray = Array.isArray(body);
    const recordsData = isArray
      ? body
      : Array.isArray(body?.records)
        ? body.records
        : [body];

    // Verify operator role in database
    const dbOperator = await prisma.employee.findUnique({
      where: { id: user.id }
    });
    if (!dbOperator || (dbOperator.role !== 'SUPER_ADMIN' && dbOperator.role !== 'HR_MANAGER')) {
      return errorResponse('Forbidden: Insufficient privileges', 403);
    }

    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Perform validation checks for all entries
    for (const data of recordsData) {
      if (!data.month || !/^\d{4}-\d{2}$/.test(data.month)) {
        return errorResponse('Invalid month format. Expected YYYY-MM', 400);
      }
      const [year, monthVal] = data.month.split('-').map(Number);
      const recordDate = new Date(year, monthVal - 1, 1);
      if (recordDate > currentMonthStart) {
        return errorResponse('Cannot generate payroll records for future months', 400);
      }

      const baseSalary = parseFloat(data.baseSalary) || 0;
      const overtimePay = parseFloat(data.overtimePay) || 0;
      const allowances = parseFloat(data.allowances || data.bonus) || 0;
      const deductions = parseFloat(data.deductions) || 0;
      const tax = parseFloat(data.tax) || 0;
      const insurance = parseFloat(data.insurance) || 0;

      if (baseSalary < 0 || overtimePay < 0 || allowances < 0 || deductions < 0 || tax < 0 || insurance < 0) {
        return errorResponse('Payroll values cannot be negative', 400);
      }
    }

    const uniqueEmployeeIds = [...new Set(recordsData.map((data: { employeeId?: string }) => data.employeeId).filter(Boolean))] as string[];
    const uniqueMonths = [...new Set(recordsData.map((data: { month?: string }) => data.month).filter(Boolean))] as string[];

    // Query existing approved/paid records to skip recalculation/overwriting
    const skippedRecords = await prisma.payrollRecord.findMany({
      where: {
        employeeId: { in: uniqueEmployeeIds },
        month: { in: uniqueMonths },
        status: { in: ['APPROVED', 'PAID'] }
      }
    });

    const approvedOrPaidSet = new Set(
      skippedRecords.map(r => `${r.employeeId}_${r.month}`)
    );
    const effectiveSalariesByMonth: Record<string, Awaited<ReturnType<typeof batchGetEffectiveSalaries>>> = {};
    for (const month of uniqueMonths) {
      effectiveSalariesByMonth[month] = await batchGetEffectiveSalaries(month, prisma);
    }

    const employees = uniqueEmployeeIds.length > 0
      ? await prisma.employee.findMany({
          where: { id: { in: uniqueEmployeeIds } },
          select: {
            id: true,
            salary: true,
            salaryType: true,
            hourlyRate: true,
            dailyRate: true,
            benefits: true,
            birthDate: true,
            dependents: true,
            insuranceSalary: true,
            contractType: true,
            employeeContracts: {
              where: { isActive: true },
              include: { contractType: true },
            },
            position: {
              select: {
                allowance: true,
              },
            },
          },
        })
      : [];
    const employeeMap = new Map(employees.map(employee => [employee.id, employee]));

    for (const data of recordsData) {
      if (data.employeeId && data.month) {
        if (approvedOrPaidSet.has(`${data.employeeId}_${data.month}`)) {
          continue;
        }
        const employee = employeeMap.get(data.employeeId);
        const effective = effectiveSalariesByMonth[data.month]?.[data.employeeId];
        if (effective && employee) {
          // Chỉ ghi đè lương cơ bản tháng cho nhân viên lương tháng; 時給/日給 dùng hourly/daily rate
          if ((employee.salaryType || '月給') === '月給') {
            data.baseSalary = effective.baseSalary;
          }
          data.hourlyRate = effective.hourlyRate;
          data.dailyRate = effective.dailyRate;
        }
      }
    }

    const rateConfig = await getActiveRateConfig(prisma);
    const rateSettings = toPayrollRateSettings(rateConfig);
    const company = await prisma.company.findFirst({ select: { healthInsuranceRate: true, incomeTaxThreshold: true } });
    const companyRate = company?.healthInsuranceRate;
    const incomeTaxThreshold = company?.incomeTaxThreshold ?? 88000;

    // Calculate detailed payroll breakdown for each record
    for (const data of recordsData) {
      if (data.employeeId && data.month) {
        if (approvedOrPaidSet.has(`${data.employeeId}_${data.month}`)) {
          continue;
        }
        const employee = employeeMap.get(data.employeeId);
        if (employee) {
          const payrollRules = resolveContractPayrollRules(employee, data.month);
          if (payrollRules.payrollMode === 'HOURS_ONLY') {
            continue;
          }
          const parsedWorkHours =
            data.workHours !== undefined && data.workHours !== null && data.workHours !== ''
              ? parseFloat(data.workHours)
              : undefined;
          const parsedWorkDays =
            data.workDays !== undefined && data.workDays !== null && data.workDays !== ''
              ? parseFloat(data.workDays)
              : undefined;
          const details = calculatePayrollDetails({
            baseSalary: parseFloat(data.baseSalary) || employee.salary || 0,
            salaryType: employee.salaryType || '月給',
            workDays: parsedWorkDays ?? 20,
            workHours: parsedWorkHours,
            hourlyRate: parseFloat(data.hourlyRate) || employee.hourlyRate || 0,
            dailyRate: parseFloat(data.dailyRate) || employee.dailyRate || 0,
            overtimeHours: parseFloat(data.overtimeHours) || 0,
            contractWorkDaysInMonth: parseFloat(data.contractWorkDaysInMonth) || undefined,
            benefits: employee.benefits,
            birthDate: employee.birthDate ? employee.birthDate.toISOString() : null,
            month: data.month,
            dependentsCount: employee.dependents.length,
            dependents: employee.dependents,
            insuranceSalary: employee.insuranceSalary,
            companyRate,
            rateSettings,
            customAllowances: (data.allowances !== undefined && data.allowances !== null && data.allowances !== '')
              ? parseFloat(data.allowances)
              : undefined,
            customBonus: (data.bonus !== undefined && data.bonus !== null && data.bonus !== '' && (data.allowances === undefined || data.allowances === null || data.allowances === ''))
              ? parseFloat(data.bonus)
              : undefined,
            positionAllowance: employee.position?.allowance || 0,
            overtimeMultiplier: payrollRules.overtimeMultiplier,
            incomeTaxThreshold,
          });

          // Map all 11 detailed fields
          data.healthInsuranceCompany = details.healthInsuranceCompany;
          data.pensionCompany = details.pensionCompany;
          data.employmentInsuranceCompany = details.employmentInsuranceCompany;
          data.workersCompCompany = details.workersCompCompany;
          data.childRearingContributionCompany = details.childRearingContributionCompany || 0;
          data.healthInsuranceEmployee = details.healthInsuranceEmployee;
          data.pensionEmployee = details.pensionEmployee;
          data.employmentInsuranceEmployee = details.employmentInsuranceEmployee;
          data.residentTax = details.residentTax;
          data.incomeTax = details.incomeTax;
          data.nursingCareInsurance = details.nursingCareInsurance;
          data.totalCompanyCost = details.totalCompanyCost;

          // Luôn dùng kết quả tính toán server làm giá trị lưu DB
          data.baseSalary = details.baseSalary;
          data.overtimePay = details.overtimePay;
          data.allowances = details.allowances;
          data.tax = details.incomeTax + details.residentTax;
          data.insurance = details.healthInsurance + details.pension + details.employmentInsurance;
          data.netSalary = details.netSalary;
          data.workHours = details.workHours;
        }
      }
    }

    const payrollEligibleRecords = recordsData.filter((data: { employeeId?: string; month?: string }) => {
      if (!data.employeeId || !data.month) return false;
      if (approvedOrPaidSet.has(`${data.employeeId}_${data.month}`)) {
        return false;
      }
      const employee = employeeMap.get(data.employeeId);
      if (!employee) return true;
      return resolveContractPayrollRules(employee, data.month).payrollMode !== 'HOURS_ONLY';
    });

    const results = await prisma.$transaction([
      ...payrollEligibleRecords.map((data: any) => {
        const baseSalary = (data.baseSalary !== undefined && data.baseSalary !== null && data.baseSalary !== '') ? parseFloat(data.baseSalary) : 0;
        const overtimePay = (data.overtimePay !== undefined && data.overtimePay !== null && data.overtimePay !== '') ? parseFloat(data.overtimePay) : 0;
        const allowances = (data.allowances !== undefined && data.allowances !== null && data.allowances !== '') 
          ? parseFloat(data.allowances) 
          : ((data.bonus !== undefined && data.bonus !== null && data.bonus !== '') ? parseFloat(data.bonus) : 0);
        const deductions = (data.deductions !== undefined && data.deductions !== null && data.deductions !== '') ? parseFloat(data.deductions) : 0;
        const tax = (data.tax !== undefined && data.tax !== null && data.tax !== '') ? parseFloat(data.tax) : 0;
        const insurance = (data.insurance !== undefined && data.insurance !== null && data.insurance !== '') ? parseFloat(data.insurance) : 0;
        const calculatedNet = baseSalary + overtimePay + allowances - (deductions + tax + insurance);
        const netSalary = (data.netSalary !== undefined && data.netSalary !== null && data.netSalary !== '') ? parseFloat(data.netSalary) : calculatedNet;

        const workDays = data.workDays !== undefined && data.workDays !== null ? parseFloat(data.workDays) : null;
        const workHours = data.workHours !== undefined && data.workHours !== null ? parseFloat(data.workHours) : null;
        const overtimeHours = data.overtimeHours !== undefined && data.overtimeHours !== null ? parseFloat(data.overtimeHours) : null;
        const absentDays = data.absentDays !== undefined && data.absentDays !== null ? parseFloat(data.absentDays) : null;

        return prisma.payrollRecord.upsert({
          where: {
            employeeId_month: {
              employeeId: data.employeeId,
              month: data.month,
            },
          },
          update: {
            baseSalary,
            overtimePay,
            bonus: allowances,
            deductions,
            tax,
            insurance,
            netSalary,
            paymentDate: new Date(data.paymentDate || `${data.month}-25`),
            status: data.status || 'PENDING',
            workDays,
            workHours,
            overtimeHours,
            absentDays,
            healthInsuranceCompany: data.healthInsuranceCompany || 0,
            pensionCompany: data.pensionCompany || 0,
            employmentInsuranceCompany: data.employmentInsuranceCompany || 0,
            workersCompCompany: data.workersCompCompany || 0,
            childRearingContributionCompany: data.childRearingContributionCompany || 0,
            healthInsuranceEmployee: data.healthInsuranceEmployee || 0,
            pensionEmployee: data.pensionEmployee || 0,
            employmentInsuranceEmployee: data.employmentInsuranceEmployee || 0,
            residentTax: data.residentTax || 0,
            incomeTax: data.incomeTax || 0,
            nursingCareInsurance: data.nursingCareInsurance || 0,
            totalCompanyCost: data.totalCompanyCost || 0,
          },
          create: {
            employeeId: data.employeeId,
            month: data.month,
            baseSalary,
            overtimePay,
            bonus: allowances,
            deductions,
            tax,
            insurance,
            netSalary,
            paymentDate: new Date(data.paymentDate || `${data.month}-25`),
            status: data.status || 'PENDING',
            workDays,
            workHours,
            overtimeHours,
            absentDays,
            healthInsuranceCompany: data.healthInsuranceCompany || 0,
            pensionCompany: data.pensionCompany || 0,
            employmentInsuranceCompany: data.employmentInsuranceCompany || 0,
            workersCompCompany: data.workersCompCompany || 0,
            childRearingContributionCompany: data.childRearingContributionCompany || 0,
            healthInsuranceEmployee: data.healthInsuranceEmployee || 0,
            pensionEmployee: data.pensionEmployee || 0,
            employmentInsuranceEmployee: data.employmentInsuranceEmployee || 0,
            residentTax: data.residentTax || 0,
            incomeTax: data.incomeTax || 0,
            nursingCareInsurance: data.nursingCareInsurance || 0,
            totalCompanyCost: data.totalCompanyCost || 0,
          },
        });
      }),
      ...(syncMonth
        ? [
            prisma.payrollRecord.deleteMany({
              where: {
                month: syncMonth,
                employeeId: {
                  notIn: recordsData
                    .filter((r: { employeeId?: string; month?: string }) => r.month === syncMonth && r.employeeId)
                    .map((r: { employeeId: string }) => r.employeeId),
                },
                status: { in: ['CALCULATED', 'PENDING'] },
              },
            }),
          ]
        : []),
    ]);

    const upserted = results.filter((r: unknown) => r && typeof r === 'object' && 'id' in (r as object)) as any[];
    const allReturned = [...upserted, ...skippedRecords];

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'PayrollRecord',
      recordId: recordsData.length > 1 ? 'BATCH' : (allReturned[0]?.id || 'BATCH'),
      details: {
        count: results.length,
        month: recordsData[0]?.month,
      },
    });

    return createdResponse(recordsData.length > 1 || syncMonth ? allReturned : allReturned[0]);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT update payroll record(s) - Approve, Pay, Edit details
export async function PUT(request: NextRequest) {
  try {
    await syncEmployeeSalaries(prisma);
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    if (viewMode === 'employee' || !hasPermission('payroll:edit', user as any)) {
      return errorResponse('Forbidden', 403);
    }

    // Verify operator role in database
    const dbOperator = await prisma.employee.findUnique({
      where: { id: user.id }
    });
    if (!dbOperator || (dbOperator.role !== 'SUPER_ADMIN' && dbOperator.role !== 'HR_MANAGER')) {
      return errorResponse('Forbidden: Insufficient privileges', 403);
    }

    const body = await request.json();

    // Case 1: Batch status update (Approve All or Pay All)
    if (body.ids && Array.isArray(body.ids)) {
      const { ids, status, paymentDate } = body;
      
      if (!status || !['APPROVED', 'PAID', 'CANCELLED', 'PENDING', 'CALCULATED'].includes(status)) {
        return errorResponse('Invalid status value', 400);
      }

      const updateData: any = { status };
      if (paymentDate) {
        updateData.paymentDate = new Date(paymentDate);
      } else if (status === 'PAID') {
        updateData.paymentDate = new Date(); // default current date for payout
      }

      const updated = await prisma.payrollRecord.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      });

      logDatabaseChange({
        request,
        action: 'UPDATE',
        model: 'PayrollRecord',
        recordId: 'BATCH',
        details: {
          count: ids.length,
          status,
        },
      });

      return successResponse({ count: updated.count });
    }

    // Case 2: Single record details update (including editing values)
    if (!body.id) {
      return errorResponse('Record ID is required', 400);
    }

    let existing = await prisma.payrollRecord.findUnique({
      where: { id: body.id }
    });

    if (!existing && body.id.startsWith('payroll-')) {
      const parts = body.id.split('-');
      if (parts.length >= 4) {
        const month = `${parts[parts.length - 2]}-${parts[parts.length - 1]}`;
        const employeeId = parts.slice(1, parts.length - 2).join('-');
        existing = await prisma.payrollRecord.findUnique({
          where: {
            employeeId_month: { employeeId, month }
          }
        });
      }
    }

    if (!existing) {
      return errorResponse('Payroll record not found', 404);
    }

    const baseSalary = body.baseSalary !== undefined ? parseFloat(body.baseSalary) : existing.baseSalary;
    const overtimePay = body.overtimePay !== undefined ? parseFloat(body.overtimePay) : existing.overtimePay;
    const allowances = body.allowances !== undefined ? parseFloat(body.allowances) : (body.bonus !== undefined ? parseFloat(body.bonus) : existing.bonus);
    const deductions = body.deductions !== undefined ? parseFloat(body.deductions) : existing.deductions;
    const status = body.status || existing.status;
    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : existing.paymentDate;

    const workDays = body.workDays !== undefined ? (body.workDays !== null ? parseFloat(body.workDays) : null) : existing.workDays;
    const workHours = body.workHours !== undefined ? (body.workHours !== null ? parseFloat(body.workHours) : null) : existing.workHours;
    const overtimeHours = body.overtimeHours !== undefined ? (body.overtimeHours !== null ? parseFloat(body.overtimeHours) : null) : existing.overtimeHours;
    const absentDays = body.absentDays !== undefined ? (body.absentDays !== null ? parseFloat(body.absentDays) : null) : existing.absentDays;

    if (baseSalary < 0 || overtimePay < 0 || allowances < 0 || deductions < 0) {
      return errorResponse('Payroll values cannot be negative', 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: existing.employeeId },
      select: {
        salary: true,
        salaryType: true,
        hourlyRate: true,
        dailyRate: true,
        benefits: true,
        birthDate: true,
        dependents: true,
        insuranceSalary: true,
        contractType: true,
        employeeContracts: {
          where: { isActive: true },
          include: { contractType: true },
        },
        position: {
          select: {
            allowance: true,
          }
        }
      },
    });

    let healthInsuranceCompany = existing.healthInsuranceCompany;
    let pensionCompany = existing.pensionCompany;
    let employmentInsuranceCompany = existing.employmentInsuranceCompany;
    let workersCompCompany = existing.workersCompCompany;
    let healthInsuranceEmployee = existing.healthInsuranceEmployee;
    let pensionEmployee = existing.pensionEmployee;
    let employmentInsuranceEmployee = existing.employmentInsuranceEmployee;
    let residentTax = existing.residentTax;
    let incomeTax = existing.incomeTax;
    let nursingCareInsurance = existing.nursingCareInsurance;
    let totalCompanyCost = existing.totalCompanyCost;

    const rateConfig = await getActiveRateConfig(prisma);
    const rateSettings = toPayrollRateSettings(rateConfig);
    const company = await prisma.company.findFirst({ select: { healthInsuranceRate: true, incomeTaxThreshold: true } });
    const companyRate = company?.healthInsuranceRate;
    const incomeTaxThreshold = company?.incomeTaxThreshold ?? 88000;

    if (employee) {
      const payrollRules = resolveContractPayrollRules(employee, existing.month);
      if (payrollRules.payrollMode === 'HOURS_ONLY') {
        return errorResponse('Dispatch employees (HOURS_ONLY) are excluded from payroll', 400);
      }
      const effective = await getEffectiveSalary(existing.employeeId, existing.month, prisma);
      const resolvedWorkHours =
        workHours !== null && workHours !== undefined
          ? workHours
          : (employee.salaryType === '時給' ? existing.workHours : undefined);
      const details = calculatePayrollDetails({
        baseSalary: body.baseSalary !== undefined ? parseFloat(body.baseSalary) : (effective?.baseSalary ?? employee.salary ?? 0),
        salaryType: employee.salaryType || '月給',
        workDays: workDays !== null ? workDays : 20,
        workHours: resolvedWorkHours ?? undefined,
        hourlyRate: effective?.hourlyRate ?? employee.hourlyRate ?? 0,
        dailyRate: effective?.dailyRate ?? employee.dailyRate ?? 0,
        overtimeHours: overtimeHours !== null ? overtimeHours : 0,
        benefits: employee.benefits,
        birthDate: employee.birthDate ? employee.birthDate.toISOString() : null,
        month: existing.month,
        dependentsCount: employee.dependents.length,
        dependents: employee.dependents,
        insuranceSalary: employee.insuranceSalary,
        companyRate,
        rateSettings,
        customAllowances: allowances,
        customBonus: undefined,
        positionAllowance: employee.position?.allowance || 0,
        overtimeMultiplier: payrollRules.overtimeMultiplier,
        incomeTaxThreshold,
      });

      healthInsuranceCompany = body.healthInsuranceCompany !== undefined ? parseFloat(body.healthInsuranceCompany) : details.healthInsuranceCompany;
      pensionCompany = body.pensionCompany !== undefined ? parseFloat(body.pensionCompany) : details.pensionCompany;
      employmentInsuranceCompany = body.employmentInsuranceCompany !== undefined ? parseFloat(body.employmentInsuranceCompany) : details.employmentInsuranceCompany;
      workersCompCompany = body.workersCompCompany !== undefined ? parseFloat(body.workersCompCompany) : details.workersCompCompany;
      let childRearingContributionCompany = body.childRearingContributionCompany !== undefined ? parseFloat(body.childRearingContributionCompany) : (details.childRearingContributionCompany || 0);
      healthInsuranceEmployee = body.healthInsuranceEmployee !== undefined ? parseFloat(body.healthInsuranceEmployee) : details.healthInsuranceEmployee;
      pensionEmployee = body.pensionEmployee !== undefined ? parseFloat(body.pensionEmployee) : details.pensionEmployee;
      employmentInsuranceEmployee = body.employmentInsuranceEmployee !== undefined ? parseFloat(body.employmentInsuranceEmployee) : details.employmentInsuranceEmployee;
      residentTax = body.residentTax !== undefined ? parseFloat(body.residentTax) : details.residentTax;
      incomeTax = body.incomeTax !== undefined ? parseFloat(body.incomeTax) : details.incomeTax;
      nursingCareInsurance = body.nursingCareInsurance !== undefined ? parseFloat(body.nursingCareInsurance) : details.nursingCareInsurance;
      
      const companySocialInsurance = healthInsuranceCompany + pensionCompany + employmentInsuranceCompany + workersCompCompany + childRearingContributionCompany;
      totalCompanyCost = baseSalary + overtimePay + allowances + companySocialInsurance;

      // We need to keep childRearingContributionCompany in the closure for prisma.update
      (existing as any).childRearingContributionCompany = childRearingContributionCompany;
    } else {
      (existing as any).childRearingContributionCompany = body.childRearingContributionCompany !== undefined ? parseFloat(body.childRearingContributionCompany) : ((existing as any).childRearingContributionCompany || 0);
    }

    const tax = employee ? (incomeTax + residentTax) : (body.tax !== undefined ? parseFloat(body.tax) : existing.tax);
    const insurance = employee ? (healthInsuranceEmployee + pensionEmployee + employmentInsuranceEmployee + nursingCareInsurance) : (body.insurance !== undefined ? parseFloat(body.insurance) : existing.insurance);

    // Mathematical net salary validation overrides client inputs
    const calculatedNet = baseSalary + overtimePay + allowances - (deductions + tax + insurance);

    if (calculatedNet < 0) {
      return errorResponse('Net salary cannot be negative', 400);
    }

    const updatedRecord = await prisma.payrollRecord.update({
      where: { id: existing.id },
      data: {
        baseSalary,
        overtimePay,
        bonus: allowances,
        deductions,
        tax,
        insurance,
        netSalary: calculatedNet,
        status,
        paymentDate,
        workDays,
        workHours,
        overtimeHours,
        absentDays,
        healthInsuranceCompany,
        pensionCompany,
        employmentInsuranceCompany,
        workersCompCompany,
        childRearingContributionCompany: (existing as any).childRearingContributionCompany,
        healthInsuranceEmployee,
        pensionEmployee,
        employmentInsuranceEmployee,
        residentTax,
        incomeTax,
        nursingCareInsurance,
        totalCompanyCost,
      },
    });

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'PayrollRecord',
      recordId: updatedRecord.id,
      details: {
        employeeId: updatedRecord.employeeId,
        month: updatedRecord.month,
        netSalary: updatedRecord.netSalary,
        status: updatedRecord.status,
      },
    });

    return successResponse(updatedRecord);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Xóa payroll records (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    if (!hasPermission('payroll:delete', user as any)) {
      return errorResponse('Forbidden', 403);
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Optional: xóa theo tháng
    const employeeId = searchParams.get('employeeId'); // Optional: xóa theo employee

    const where: any = {};
    if (month) where.month = month;
    if (employeeId) where.employeeId = employeeId;

    const deleted = await prisma.payrollRecord.deleteMany({ where });

    logDatabaseChange({
      user,
      action: 'DELETE',
      model: 'PayrollRecord',
      recordId: 'bulk-delete',
      details: { count: deleted.count, where }
    });

    return successResponse({
      message: `Deleted ${deleted.count} payroll records`,
      count: deleted.count
    });
  } catch (error) {
    return handleApiError(error);
  }
}
