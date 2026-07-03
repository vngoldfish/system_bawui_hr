import { prisma } from '@/lib/prisma';
import { batchGetEffectiveSalaries, calculatePayrollDetails, type PayrollRateSettings } from '@/lib/payroll-calculator';
import { resolveContractPayrollRules } from '@/lib/contract-payroll-rules';
import { getActiveRateConfig, toPayrollRateSettings } from '@/services/payrollRateService';
import type { OvertimeContractInfo, OvertimeHolidayInfo } from '@/lib/attendance-overtime';
import {
  aggregateAttendanceStats,
  buildAttendanceLookupKey,
  countContractWorkDaysInMonth,
  getActiveContractForDate,
  getAttendanceMonthForPayroll,
  getPayrollAttendanceRangeJst,
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
  contractType?: {
    id: string;
    name: string;
    category?: string | null;
    payrollMode?: string | null;
    defaultSalaryType?: string | null;
    overtimeMultiplier?: number | null;
    socialInsuranceDefault?: boolean | null;
    employmentInsuranceDefault?: boolean | null;
    workersCompDefault?: boolean | null;
    maxWeeklyHours?: number | null;
    defaultStandardHoursPerDay?: number | null;
    defaultHolidayWorkCountsAsOvertime?: boolean | null;
    contractTemplateNotes?: string | null;
  } | null;
  employeeContracts?: Array<{
    workDays: unknown;
    isActive: boolean;
    startDate: Date | string;
    endDate?: Date | string | null;
    standardHoursPerDay?: number | null;
    holidayWorkCountsAsOvertime?: boolean | null;
    contractType?: {
      id: string;
      name: string;
      category?: string | null;
      payrollMode?: string | null;
      defaultSalaryType?: string | null;
      overtimeMultiplier?: number | null;
      socialInsuranceDefault?: boolean | null;
      employmentInsuranceDefault?: boolean | null;
      workersCompDefault?: boolean | null;
      maxWeeklyHours?: number | null;
      defaultStandardHoursPerDay?: number | null;
      defaultHolidayWorkCountsAsOvertime?: boolean | null;
      contractTemplateNotes?: string | null;
    } | null;
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
    contractType: emp.employeeContracts?.[0]?.contractType?.name || emp.contractType?.name || '正社員',
    payrollContractType: emp.contractType ?? emp.employeeContracts?.[0]?.contractType ?? null,
    benefits: mergeBenefits(emp.benefits),
    birthDate: emp.birthDate ? emp.birthDate.toISOString() : null,
    dependents: mapDependents(emp.dependents),
    employeeContracts: emp.employeeContracts?.map(c => ({
      workDays: c.workDays,
      isActive: c.isActive,
      startDate: c.startDate instanceof Date ? c.startDate.toISOString() : c.startDate,
      endDate: c.endDate instanceof Date ? c.endDate.toISOString() : (c.endDate ?? null),
      standardHoursPerDay: c.standardHoursPerDay ?? 8,
      holidayWorkCountsAsOvertime: c.holidayWorkCountsAsOvertime ?? true,
      contractType: c.contractType ?? undefined,
    })),
    workLimitVisa28h: !!emp.workLimitVisa28h,
    workLimitIncomeCap80k: !!emp.workLimitIncomeCap80k,
    workLimitWeeklyHours: emp.workLimitWeeklyHours ?? null,
    workLimitMonthlyIncome: emp.workLimitMonthlyIncome ?? null,
  };
}

export async function batchFetchAttendanceForPayrollRecords(
  records: { employeeId: string; month: string }[]
): Promise<Map<string, import('@/lib/payroll-helpers').AttendanceRecordForStats[]>> {
  const result = new Map<string, import('@/lib/payroll-helpers').AttendanceRecordForStats[]>();
  if (records.length === 0) return result;

  const uniqueKeys = new Map<string, { employeeId: string; month: string; startUtc: Date; endUtc: Date }>();
  let minStart = new Date(8640000000000000);
  let maxEnd = new Date(-8640000000000000);

  for (const record of records) {
    const key = buildAttendanceLookupKey(record.employeeId, record.month);
    if (uniqueKeys.has(key)) continue;

    const range = getPayrollAttendanceRangeJst(record.month);
    uniqueKeys.set(key, { employeeId: record.employeeId, month: record.month, startUtc: range.startUtc, endUtc: range.endUtc });
    if (range.startUtc < minStart) minStart = range.startUtc;
    if (range.endUtc > maxEnd) maxEnd = range.endUtc;
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
      a => a.employeeId === entry.employeeId && a.date >= entry.startUtc && a.date <= entry.endUtc
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
    insuranceSalary?: number | null;
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
    contractType?: {
      id: string;
      name: string;
      category?: string | null;
      payrollMode?: string | null;
      defaultSalaryType?: string | null;
      overtimeMultiplier?: number | null;
      socialInsuranceDefault?: boolean | null;
      employmentInsuranceDefault?: boolean | null;
      workersCompDefault?: boolean | null;
      maxWeeklyHours?: number | null;
      defaultStandardHoursPerDay?: number | null;
      defaultHolidayWorkCountsAsOvertime?: boolean | null;
      contractTemplateNotes?: string | null;
    } | null;
    employeeContracts?: Array<{
      workDays: unknown;
      isActive: boolean;
      startDate: string | Date;
      endDate?: string | Date | null;
      standardHoursPerDay?: number | null;
      holidayWorkCountsAsOvertime?: boolean | null;
      contractType?: {
        id: string;
        name: string;
        category?: string | null;
        payrollMode?: string | null;
        defaultSalaryType?: string | null;
        overtimeMultiplier?: number | null;
        socialInsuranceDefault?: boolean | null;
        employmentInsuranceDefault?: boolean | null;
        workersCompDefault?: boolean | null;
        maxWeeklyHours?: number | null;
        defaultStandardHoursPerDay?: number | null;
        defaultHolidayWorkCountsAsOvertime?: boolean | null;
        contractTemplateNotes?: string | null;
      } | null;
    }>;
  } | null | undefined,
  company: { healthInsuranceRate?: number | null } | null | undefined,
  attendanceMap: Map<string, import('@/lib/payroll-helpers').AttendanceRecordForStats[]>,
  rateSettings?: PayrollRateSettings,
  roundingPolicy = 'exact',
  effectiveSalary?: { baseSalary: number; hourlyRate: number; dailyRate: number },
  holidays: OvertimeHolidayInfo[] = []
) {
  const allowances = r.bonus;

  const attendanceKey = buildAttendanceLookupKey(r.employeeId, r.month);
  const attendance = attendanceMap.get(attendanceKey) || [];
  const overtimeContext = emp?.employeeContracts?.length
    ? {
        contracts: emp.employeeContracts as OvertimeContractInfo[],
        holidays,
      }
    : undefined;
  const stats = aggregateAttendanceStats(attendance, roundingPolicy, overtimeContext);
  const [workingYear, workingMonth] = getAttendanceMonthForPayroll(r.month).split('-').map(Number);
  const midMonthDate = `${workingYear}-${String(workingMonth).padStart(2, '0')}-15`;
  const activeContract = getActiveContractForDate(
    emp?.employeeContracts as Parameters<typeof getActiveContractForDate>[0],
    midMonthDate
  );
  const fallbackWorkDays = countContractWorkDaysInMonth(
    activeContract?.workDays ?? getContractWorkDays(emp),
    workingYear,
    workingMonth
  );
  const contractWorkDaysInMonth = fallbackWorkDays;

  const isLocked = r.status === 'APPROVED' || r.status === 'PAID';

  const resolvedWorkDays =
    stats.workDays > 0
      ? stats.workDays
      : stats.absentDays > 0 || stats.overtimeHours > 0
        ? 0
        : fallbackWorkDays;
  const workDays = isLocked ? (r.workDays ?? resolvedWorkDays) : resolvedWorkDays;
  const absentDays = isLocked ? (r.absentDays ?? stats.absentDays) : stats.absentDays;
  const overtimeHours = isLocked ? (r.overtimeHours ?? stats.overtimeHours) : stats.overtimeHours;
  let workHours = isLocked ? (r.workHours ?? stats.workHours) : stats.workHours;

  let baseSalary = r.baseSalary;
  let overtimePay = r.overtimePay;
  let healthInsuranceCompany = r.healthInsuranceCompany;
  let pensionCompany = r.pensionCompany;
  let employmentInsuranceCompany = r.employmentInsuranceCompany;
  let workersCompCompany = r.workersCompCompany;
  let childRearingContributionCompany = (r as any).childRearingContributionCompany || 0;
  let childRearingSupportCompany = (r as any).childRearingSupportCompany || 0;
  let healthInsuranceEmployee = r.healthInsuranceEmployee;
  let pensionEmployee = r.pensionEmployee;
  let employmentInsuranceEmployee = r.employmentInsuranceEmployee;
  let childRearingSupportEmployee = (r as any).childRearingSupportEmployee || 0;
  let residentTax = r.residentTax;
  let incomeTax = r.incomeTax;
  let nursingCareInsurance = r.nursingCareInsurance;
  let totalCompanyCost = r.totalCompanyCost;
  let netSalary = r.netSalary;

  const payrollRules = emp ? resolveContractPayrollRules(emp, r.month) : null;

  if (emp && !isLocked && payrollRules?.payrollMode !== 'HOURS_ONLY') {
    const rates = effectiveSalary ?? {
      baseSalary: emp.salary || 0,
      hourlyRate: emp.hourlyRate || 0,
      dailyRate: emp.dailyRate || 0,
    };
    const details = calculatePayrollDetails({
      baseSalary: rates.baseSalary,
      salaryType: emp.salaryType || '月給',
      workDays: resolvedWorkDays,
      workHours: stats.workHours,
      hourlyRate: rates.hourlyRate,
      dailyRate: rates.dailyRate,
      overtimeHours,
      contractWorkDaysInMonth,
      benefits: mergeBenefits(emp.benefits),
      birthDate: emp.birthDate ? emp.birthDate.toISOString() : null,
      month: r.month,
      dependentsCount: emp.dependents ? emp.dependents.length : 0,
      dependents: mapDependents(emp.dependents),
      insuranceSalary: emp.insuranceSalary ?? undefined,
      companyRate: company?.healthInsuranceRate,
      rateSettings,
      customAllowances: allowances,
      positionAllowance: emp.position?.allowance || 0,
      overtimeMultiplier: payrollRules!.overtimeMultiplier,
    });

    baseSalary = details.baseSalary;
    overtimePay = details.overtimePay;
    workHours = details.workHours;
    healthInsuranceCompany = details.healthInsuranceCompany;
    pensionCompany = details.pensionCompany;
    employmentInsuranceCompany = details.employmentInsuranceCompany;
    workersCompCompany = details.workersCompCompany;
    childRearingContributionCompany = details.childRearingContributionCompany || 0;
    childRearingSupportCompany = details.childRearingSupportCompany || 0;
    healthInsuranceEmployee = details.healthInsuranceEmployee;
    pensionEmployee = details.pensionEmployee;
    employmentInsuranceEmployee = details.employmentInsuranceEmployee;
    childRearingSupportEmployee = details.childRearingSupportEmployee || 0;
    residentTax = details.residentTax;
    incomeTax = details.incomeTax;
    nursingCareInsurance = details.nursingCareInsurance;
    totalCompanyCost = details.totalCompanyCost;
    netSalary = details.netSalary;
  }

  const totalGross = baseSalary + overtimePay + allowances;
  const healthInsurance = healthInsuranceEmployee + (nursingCareInsurance || 0);
  const totalDeductions = r.deductions + healthInsurance + pensionEmployee + employmentInsuranceEmployee + childRearingSupportEmployee + incomeTax + residentTax;

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
    childRearingContributionCompany,
    childRearingSupportCompany,
    healthInsuranceEmployee,
    pensionEmployee,
    employmentInsuranceEmployee,
    childRearingSupportEmployee,
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
    insuranceSalary?: number | null;
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
    contractType?: {
      id: string;
      name: string;
      category?: string | null;
      payrollMode?: string | null;
      defaultSalaryType?: string | null;
      overtimeMultiplier?: number | null;
      socialInsuranceDefault?: boolean | null;
      employmentInsuranceDefault?: boolean | null;
      workersCompDefault?: boolean | null;
      maxWeeklyHours?: number | null;
      defaultStandardHoursPerDay?: number | null;
      defaultHolidayWorkCountsAsOvertime?: boolean | null;
      contractTemplateNotes?: string | null;
    } | null;
    employeeContracts?: Array<{
      workDays: unknown;
      isActive: boolean;
      startDate: Date | string;
      endDate?: Date | string | null;
      standardHoursPerDay?: number | null;
      holidayWorkCountsAsOvertime?: boolean | null;
      contractType?: {
        id: string;
        name: string;
        category?: string | null;
        payrollMode?: string | null;
        defaultSalaryType?: string | null;
        overtimeMultiplier?: number | null;
        socialInsuranceDefault?: boolean | null;
        employmentInsuranceDefault?: boolean | null;
        workersCompDefault?: boolean | null;
        maxWeeklyHours?: number | null;
        defaultStandardHoursPerDay?: number | null;
        defaultHolidayWorkCountsAsOvertime?: boolean | null;
        contractTemplateNotes?: string | null;
      } | null;
    }>;
  }>,
  company: { healthInsuranceRate?: number | null; roundingPolicy?: string | null } | null
) {
  const roundingPolicy = company?.roundingPolicy || 'exact';
  const rateConfig = await getActiveRateConfig(prisma);
  const rateSettings = toPayrollRateSettings(rateConfig);

  const dbRecords = await prisma.payrollRecord.findMany({
    orderBy: { month: 'desc' },
  });

  const attendanceMap = await batchFetchAttendanceForPayrollRecords(
    dbRecords.map(r => ({ employeeId: r.employeeId, month: r.month }))
  );

  const uniqueMonths = [...new Set(dbRecords.map(r => r.month))];
  const effectiveSalariesByMonth: Record<string, Awaited<ReturnType<typeof batchGetEffectiveSalaries>>> = {};
  for (const month of uniqueMonths) {
    effectiveSalariesByMonth[month] = await batchGetEffectiveSalaries(month, prisma);
  }

  let holidayMin = new Date(8640000000000000);
  let holidayMax = new Date(-8640000000000000);
  for (const month of uniqueMonths) {
    const range = getPayrollAttendanceRangeJst(month);
    if (range.startUtc < holidayMin) holidayMin = range.startUtc;
    if (range.endUtc > holidayMax) holidayMax = range.endUtc;
  }
  const dbHolidays =
    uniqueMonths.length > 0
      ? await prisma.holiday.findMany({
          where: { isActive: true, date: { gte: holidayMin, lte: holidayMax } },
        })
      : [];
  const holidays: OvertimeHolidayInfo[] = dbHolidays.map(h => ({
    date: h.date,
    isActive: h.isActive,
  }));

  const employees = dbEmployees.map(mapEmployeeToClient);
  const records = dbRecords.map(r => {
    const emp = dbEmployees.find(e => e.id === r.employeeId);
    const effectiveSalary = effectiveSalariesByMonth[r.month]?.[r.employeeId];
    return transformPayrollRecord(
      r,
      emp,
      company,
      attendanceMap,
      rateSettings,
      roundingPolicy,
      effectiveSalary,
      holidays
    );
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
    insuranceSalary?: number | null;
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
    contractType?: {
      id: string;
      name: string;
      category?: string | null;
      payrollMode?: string | null;
      defaultSalaryType?: string | null;
      overtimeMultiplier?: number | null;
      socialInsuranceDefault?: boolean | null;
      employmentInsuranceDefault?: boolean | null;
      workersCompDefault?: boolean | null;
      maxWeeklyHours?: number | null;
      defaultStandardHoursPerDay?: number | null;
      defaultHolidayWorkCountsAsOvertime?: boolean | null;
      contractTemplateNotes?: string | null;
    } | null;
    employeeContracts?: Array<{
      workDays: unknown;
      isActive: boolean;
      startDate: Date | string;
      endDate?: Date | string | null;
      standardHoursPerDay?: number | null;
      holidayWorkCountsAsOvertime?: boolean | null;
      contractType?: {
        id: string;
        name: string;
        category?: string | null;
        payrollMode?: string | null;
        defaultSalaryType?: string | null;
        overtimeMultiplier?: number | null;
        socialInsuranceDefault?: boolean | null;
        employmentInsuranceDefault?: boolean | null;
        workersCompDefault?: boolean | null;
        maxWeeklyHours?: number | null;
        defaultStandardHoursPerDay?: number | null;
        defaultHolidayWorkCountsAsOvertime?: boolean | null;
        contractTemplateNotes?: string | null;
      } | null;
    }>;
  },
  company: { healthInsuranceRate?: number | null; roundingPolicy?: string | null; salaryCutoffDay?: string | null; payday?: string | null; name?: string; address?: string | null } | null
) {
  const roundingPolicy = company?.roundingPolicy || 'exact';
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

  const uniqueMonths = [...new Set(dbRecords.map(r => r.month))];
  const effectiveSalariesByMonth: Record<string, Awaited<ReturnType<typeof batchGetEffectiveSalaries>>> = {};
  for (const month of uniqueMonths) {
    effectiveSalariesByMonth[month] = await batchGetEffectiveSalaries(month, prisma);
  }

  let holidayMin = new Date(8640000000000000);
  let holidayMax = new Date(-8640000000000000);
  for (const month of uniqueMonths) {
    const range = getPayrollAttendanceRangeJst(month);
    if (range.startUtc < holidayMin) holidayMin = range.startUtc;
    if (range.endUtc > holidayMax) holidayMax = range.endUtc;
  }
  const dbHolidays =
    uniqueMonths.length > 0
      ? await prisma.holiday.findMany({
          where: { isActive: true, date: { gte: holidayMin, lte: holidayMax } },
        })
      : [];
  const holidays: OvertimeHolidayInfo[] = dbHolidays.map(h => ({
    date: h.date,
    isActive: h.isActive,
  }));

  const records = dbRecords.map(r => {
    const effectiveSalary = effectiveSalariesByMonth[r.month]?.[r.employeeId];
    return transformPayrollRecord(
      r,
      dbUser,
      company,
      attendanceMap,
      rateSettings,
      roundingPolicy,
      effectiveSalary,
      holidays
    );
  });
  const employees = [{
    ...mapEmployeeToClient({ ...dbUser, employeeContracts: dbUser.employeeContracts }),
    position: dbUser.position?.name || '一般社員',
    contractType: '正社員',
  }];

  return { employees, records };
}