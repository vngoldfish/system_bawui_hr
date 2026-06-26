import { prisma } from '@/lib/prisma';
import { calculatePayrollDetails, type PayrollRateSettings } from '@/lib/payroll-calculator';
import { getActiveRateConfig, toPayrollRateSettings } from '@/services/payrollRateService';
import {
  aggregateAttendanceStats,
  buildAttendanceLookupKey,
  countContractWorkDaysInMonth,
  getWorkingMonthDateRange,
} from '@/lib/payroll-helpers';

export type MergedBenefits = {
  healthInsurance: boolean;
  pension: boolean;
  employmentInsurance: boolean;
  workersComp: boolean;
  transportation: number;
  housing: number;
  meal: number;
  residentTax: boolean;
  residentTaxAmount: number;
};

export const mergeBenefits = (benefits: unknown): MergedBenefits => {
  const defaults: MergedBenefits = {
    healthInsurance: true,
    pension: true,
    employmentInsurance: true,
    workersComp: true,
    transportation: 0,
    housing: 0,
    meal: 0,
    residentTax: false,
    residentTaxAmount: 0,
  };
  if (!benefits || typeof benefits !== 'object') return defaults;
  const b = benefits as Record<string, unknown>;
  return {
    healthInsurance: (b.healthInsurance as boolean | undefined) ?? defaults.healthInsurance,
    pension: (b.pension as boolean | undefined) ?? defaults.pension,
    employmentInsurance: (b.employmentInsurance as boolean | undefined) ?? defaults.employmentInsurance,
    workersComp: (b.workersComp as boolean | undefined) ?? defaults.workersComp,
    transportation: Number(b.transportation ?? defaults.transportation),
    housing: Number(b.housing ?? defaults.housing),
    meal: Number(b.meal ?? defaults.meal),
    residentTax: (b.residentTax as boolean | undefined) ?? defaults.residentTax,
    residentTaxAmount: Number(b.residentTaxAmount ?? defaults.residentTaxAmount),
  };
};

function getContractWorkDays(emp: { employeeContracts?: Array<{ workDays: unknown; isActive?: boolean }> } | null | undefined) {
  const activeContract = emp?.employeeContracts?.find(c => c.isActive) || emp?.employeeContracts?.[0];
  return activeContract?.workDays;
}

function mapDependents(dependents: Array<{
  id: string;
  name: string;
  relationship: string;
  birthDate: Date | null;
  gender: string | null;
  cohabitation: string;
}> | undefined) {
  return dependents
    ? dependents.map(d => ({
        id: d.id,
        name: d.name,
        relationship: d.relationship,
        birthDate: d.birthDate ? d.birthDate.toISOString() : null,
        gender: d.gender,
        cohabitation: d.cohabitation,
      }))
    : [];
}

export function mapEmployeeToClient(emp: {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  firstNameKana?: string | null;
  lastNameKana?: string | null;
  department?: { name: string } | null;
  position?: { name: string; allowance?: number | null } | null;
  salary?: number | null;
  salaryType?: string | null;
  hourlyRate?: number | null;
  dailyRate?: number | null;
  benefits?: unknown;
  birthDate?: Date | null;
  dependents?: Array<{
    id: string;
    name: string;
    relationship: string;
    birthDate: Date | null;
    gender: string | null;
    cohabitation: string;
  }>;
  employeeContracts?: Array<{
    workDays: unknown;
    isActive: boolean;
    startDate: Date | string;
    endDate?: Date | string | null;
    standardHoursPerDay?: number | null;
    contractType?: { name: string } | null;
  }>;
  workLimitVisa28h?: boolean | null;
  workLimitIncomeCap80k?: boolean | null;
  workLimitWeeklyHours?: number | null;
  workLimitMonthlyIncome?: number | null;
}) {
  return {
    id: emp.id,
    employeeCode: emp.employeeCode,
    firstName: emp.firstName,
    lastName: emp.lastName,
    firstNameKana: emp.firstNameKana || '',
    lastNameKana: emp.lastNameKana || '',
    department: emp.department?.name || '未所属',
    position: emp.position?.name || '役職なし',
    positionAllowance: emp.position?.allowance || 0,
    salary: emp.salary || 0,
    salaryType: emp.salaryType || '月給',
    hourlyRate: emp.hourlyRate || 0,
    dailyRate: emp.dailyRate || 0,
    contractType: emp.employeeContracts?.[0]?.contractType?.name || '正社員',
    benefits: mergeBenefits(emp.benefits),
    birthDate: emp.birthDate ? emp.birthDate.toISOString() : null,
    dependents: mapDependents(emp.dependents),
    employeeContracts: emp.employeeContracts?.map(c => ({
      workDays: c.workDays,
      isActive: c.isActive,
      startDate: c.startDate instanceof Date ? c.startDate.toISOString() : c.startDate,
      endDate: c.endDate instanceof Date ? c.endDate.toISOString() : (c.endDate ?? null),
      standardHoursPerDay: c.standardHoursPerDay ?? 8,
    })),
    workLimitVisa28h: !!emp.workLimitVisa28h,
    workLimitIncomeCap80k: !!emp.workLimitIncomeCap80k,
    workLimitWeeklyHours: emp.workLimitWeeklyHours ?? null,
    workLimitMonthlyIncome: emp.workLimitMonthlyIncome ?? null,
  };
}

export async function batchFetchAttendanceForPayrollRecords(
  records: { employeeId: string; month: string }[]
): Promise<Map<string, Array<{ status: string; overtimeHours?: number | null }>>> {
  const result = new Map<string, Array<{ status: string; overtimeHours?: number | null }>>();
  if (records.length === 0) return result;

  const uniqueKeys = new Map<string, { employeeId: string; month: string; start: Date; end: Date }>();
  let minStart = new Date(8640000000000000);
  let maxEnd = new Date(-8640000000000000);

  for (const record of records) {
    const key = buildAttendanceLookupKey(record.employeeId, record.month);
    if (uniqueKeys.has(key)) continue;

    const range = getWorkingMonthDateRange(record.month);
    uniqueKeys.set(key, { ...record, ...range });
    if (range.start < minStart) minStart = range.start;
    if (range.end > maxEnd) maxEnd = range.end;
  }

  const employeeIds = [...new Set(records.map(r => r.employeeId))];
  const allAttendance = await prisma.attendanceRecord.findMany({
    where: {
      employeeId: { in: employeeIds },
      date: {
        gte: minStart,
        lte: maxEnd,
      },
    },
  });

  for (const [, entry] of uniqueKeys) {
    const key = buildAttendanceLookupKey(entry.employeeId, entry.month);
    const filtered = allAttendance.filter(
      a => a.employeeId === entry.employeeId && a.date >= entry.start && a.date <= entry.end
    );
    result.set(key, filtered);
  }

  return result;
}

export function transformPayrollRecord(
  r: {
    id: string;
    employeeId: string;
    month: string;
    baseSalary: number;
    overtimePay: number;
    bonus: number;
    deductions: number;
    netSalary: number;
    status: string;
    paymentDate: Date | null;
    workDays: number | null;
    workHours: number | null;
    overtimeHours: number | null;
    absentDays: number | null;
    healthInsuranceCompany: number;
    pensionCompany: number;
    employmentInsuranceCompany: number;
    workersCompCompany: number;
    healthInsuranceEmployee: number;
    pensionEmployee: number;
    employmentInsuranceEmployee: number;
    residentTax: number;
    incomeTax: number;
    nursingCareInsurance: number;
    totalCompanyCost: number;
  },
  emp: {
    salary?: number | null;
    salaryType?: string | null;
    hourlyRate?: number | null;
    dailyRate?: number | null;
    benefits?: unknown;
    birthDate?: Date | null;
    dependents?: Array<{
      id: string;
      name: string;
      relationship: string;
      birthDate: Date | null;
      gender: string | null;
      cohabitation: string;
    }>;
    position?: { allowance?: number | null } | null;
    employeeContracts?: Array<{ workDays: unknown; isActive: boolean }>;
  } | null | undefined,
  company: { healthInsuranceRate?: number | null } | null | undefined,
  attendanceMap: Map<string, Array<{ status: string; overtimeHours?: number | null }>>,
  rateSettings?: PayrollRateSettings
) {
  const allowances = r.bonus;

  const attendanceKey = buildAttendanceLookupKey(r.employeeId, r.month);
  const attendance = attendanceMap.get(attendanceKey) || [];
  const stats = aggregateAttendanceStats(attendance);
  const workingRange = getWorkingMonthDateRange(r.month);
  const workingYear = workingRange.start.getFullYear();
  const workingMonth = workingRange.start.getMonth() + 1;
  const fallbackWorkDays = countContractWorkDaysInMonth(getContractWorkDays(emp), workingYear, workingMonth);

  const workDays = stats.workDays > 0 ? stats.workDays : (r.workDays ?? fallbackWorkDays);
  const absentDays = r.absentDays ?? stats.absentDays;
  const overtimeHours = stats.workDays > 0 ? stats.overtimeHours : (r.overtimeHours ?? 0);
  let workHours = r.workHours ?? stats.workHours;

  let baseSalary = r.baseSalary;
  let overtimePay = r.overtimePay;
  let healthInsuranceCompany = r.healthInsuranceCompany;
  let pensionCompany = r.pensionCompany;
  let employmentInsuranceCompany = r.employmentInsuranceCompany;
  let workersCompCompany = r.workersCompCompany;
  let healthInsuranceEmployee = r.healthInsuranceEmployee;
  let pensionEmployee = r.pensionEmployee;
  let employmentInsuranceEmployee = r.employmentInsuranceEmployee;
  let residentTax = r.residentTax;
  let incomeTax = r.incomeTax;
  let nursingCareInsurance = r.nursingCareInsurance;
  let totalCompanyCost = r.totalCompanyCost;
  let netSalary = r.netSalary;

  const attendanceStale =
    stats.workDays > 0 &&
    r.workDays !== null &&
    r.workDays !== undefined &&
    r.workDays !== stats.workDays;
  const hourlyDisplayBroken =
    emp &&
    r.baseSalary === 0 &&
    (emp.salaryType === '時給' || emp.salaryType === '日給') &&
    ((emp.hourlyRate || 0) > 0 || (emp.dailyRate || 0) > 0) &&
    workDays > 0;

  if (emp && (!totalCompanyCost || totalCompanyCost === 0 || hourlyDisplayBroken || attendanceStale)) {
    const details = calculatePayrollDetails({
      baseSalary: emp.salary || 0,
      salaryType: emp.salaryType || '月給',
      workDays,
      hourlyRate: emp.hourlyRate || 0,
      dailyRate: emp.dailyRate || 0,
      overtimeHours,
      benefits: mergeBenefits(emp.benefits),
      birthDate: emp.birthDate ? emp.birthDate.toISOString() : null,
      month: r.month,
      dependentsCount: emp.dependents ? emp.dependents.length : 0,
      dependents: mapDependents(emp.dependents),
      companyRate: company?.healthInsuranceRate,
      rateSettings,
      customAllowances: allowances,
      positionAllowance: emp.position?.allowance || 0,
    });

    baseSalary = details.baseSalary;
    overtimePay = details.overtimePay;
    workHours = details.workHours;
    healthInsuranceCompany = details.healthInsuranceCompany;
    pensionCompany = details.pensionCompany;
    employmentInsuranceCompany = details.employmentInsuranceCompany;
    workersCompCompany = details.workersCompCompany;
    healthInsuranceEmployee = details.healthInsuranceEmployee;
    pensionEmployee = details.pensionEmployee;
    employmentInsuranceEmployee = details.employmentInsuranceEmployee;
    residentTax = details.residentTax;
    incomeTax = details.incomeTax;
    nursingCareInsurance = details.nursingCareInsurance;
    totalCompanyCost = details.totalCompanyCost;
    netSalary = details.netSalary;
  }

  const totalGross = baseSalary + overtimePay + allowances;
  const healthInsurance = healthInsuranceEmployee + (nursingCareInsurance || 0);
  const totalDeductions = r.deductions + healthInsurance + pensionEmployee + employmentInsuranceEmployee + incomeTax + residentTax;

  return {
    id: r.id,
    employeeId: r.employeeId,
    month: r.month,
    baseSalary,
    overtimePay,
    allowances,
    healthInsurance,
    pension: pensionEmployee,
    employmentInsurance: employmentInsuranceEmployee,
    workersComp: workersCompCompany,
    incomeTax,
    residentTax,
    totalGross,
    totalDeductions,
    netSalary,
    salaryType: emp?.salaryType || '月給',
    workDays,
    workHours,
    overtimeHours: Math.round(overtimeHours * 10) / 10,
    absentDays,
    status: r.status,
    paymentDate: r.paymentDate ? r.paymentDate.toISOString() : undefined,
    healthInsuranceCompany,
    pensionCompany,
    employmentInsuranceCompany,
    workersCompCompany,
    healthInsuranceEmployee,
    pensionEmployee,
    employmentInsuranceEmployee,
    nursingCareInsurance,
    totalCompanyCost,
  };
}

export async function loadPayrollRecordsForAdmin(
  dbEmployees: Array<{
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    firstNameKana?: string | null;
    lastNameKana?: string | null;
    department?: { name: string } | null;
    position?: { name: string; allowance?: number | null } | null;
    salary?: number | null;
    salaryType?: string | null;
    hourlyRate?: number | null;
    dailyRate?: number | null;
    benefits?: unknown;
    birthDate?: Date | null;
    dependents?: Array<{
      id: string;
      name: string;
      relationship: string;
      birthDate: Date | null;
      gender: string | null;
      cohabitation: string;
    }>;
    employeeContracts?: Array<{
      workDays: unknown;
      isActive: boolean;
      startDate: Date | string;
      endDate?: Date | string | null;
      standardHoursPerDay?: number | null;
      contractType?: { name: string } | null;
    }>;
  }>,
  company: { healthInsuranceRate?: number | null } | null
) {
  const rateConfig = await getActiveRateConfig(prisma);
  const rateSettings = toPayrollRateSettings(rateConfig);

  const dbRecords = await prisma.payrollRecord.findMany({
    orderBy: { month: 'desc' },
  });

  const attendanceMap = await batchFetchAttendanceForPayrollRecords(
    dbRecords.map(r => ({ employeeId: r.employeeId, month: r.month }))
  );

  const employees = dbEmployees.map(mapEmployeeToClient);
  const records = dbRecords.map(r => {
    const emp = dbEmployees.find(e => e.id === r.employeeId);
    return transformPayrollRecord(r, emp, company, attendanceMap, rateSettings);
  });

  return { employees, records };
}

export async function loadPayrollRecordsForEmployee(
  dbUser: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    firstNameKana?: string | null;
    lastNameKana?: string | null;
    hireDate: Date;
    department?: { name: string } | null;
    position?: { name: string; allowance?: number | null } | null;
    salary?: number | null;
    salaryType?: string | null;
    hourlyRate?: number | null;
    dailyRate?: number | null;
    benefits?: unknown;
    birthDate?: Date | null;
    dependents?: Array<{
      id: string;
      name: string;
      relationship: string;
      birthDate: Date | null;
      gender: string | null;
      cohabitation: string;
    }>;
    employeeContracts?: Array<{
      workDays: unknown;
      isActive: boolean;
      startDate: Date | string;
      endDate?: Date | string | null;
      standardHoursPerDay?: number | null;
      contractType?: { name: string } | null;
    }>;
  },
  company: { healthInsuranceRate?: number | null; salaryCutoffDay?: string | null; payday?: string | null; name?: string; address?: string | null } | null
) {
  const hireDate = new Date(dbUser.hireDate);
  const hireYear = hireDate.getFullYear();
  const hireMonth = hireDate.getMonth() + 1;
  const hireMonthStr = `${hireYear}-${String(hireMonth).padStart(2, '0')}`;

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const nowMonthStr = `${nowYear}-${String(nowMonth).padStart(2, '0')}`;

  const dbRecords = await prisma.payrollRecord.findMany({
    where: {
      employeeId: dbUser.id,
      month: {
        gte: hireMonthStr,
        lte: nowMonthStr,
      },
      status: {
        in: ['APPROVED', 'PAID'],
      },
    },
    orderBy: { month: 'desc' },
  });

  const rateConfig = await getActiveRateConfig(prisma);
  const rateSettings = toPayrollRateSettings(rateConfig);

  const attendanceMap = await batchFetchAttendanceForPayrollRecords(
    dbRecords.map(r => ({ employeeId: r.employeeId, month: r.month }))
  );

  const records = dbRecords.map(r => transformPayrollRecord(r, dbUser, company, attendanceMap, rateSettings));
  const employees = [{
    ...mapEmployeeToClient({ ...dbUser, employeeContracts: dbUser.employeeContracts }),
    position: dbUser.position?.name || '一般社員',
    contractType: '正社員',
  }];

  return { employees, records };
}