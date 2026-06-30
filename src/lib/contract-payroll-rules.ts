export type ContractCategory =
  | 'SEISHAIN'
  | 'KEIYAKU'
  | 'PART'
  | 'ARUBAITO'
  | 'HAKKEN'
  | 'CUSTOM';

export type PayrollMode = 'FULL' | 'HOURS_ONLY';

export interface ContractTypeRules {
  id: string;
  name: string;
  category: ContractCategory;
  payrollMode: PayrollMode;
  defaultSalaryType: string;
  overtimeMultiplier: number;
  socialInsuranceDefault: boolean;
  employmentInsuranceDefault: boolean;
  workersCompDefault: boolean;
  maxWeeklyHours: number | null;
  defaultStandardHoursPerDay: number;
  defaultHolidayWorkCountsAsOvertime: boolean;
  contractTemplateNotes: string;
}

export interface ResolvedPayrollRules {
  contractType: ContractTypeRules;
  salaryType: string;
  payrollMode: PayrollMode;
  overtimeMultiplier: number;
  socialInsuranceEnabled: boolean;
  employmentInsuranceEnabled: boolean;
  workersCompEnabled: boolean;
  standardHoursPerDay: number;
  holidayWorkCountsAsOvertime: boolean;
}

type ContractTypeLike = {
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
};

type EmployeeContractLike = {
  isActive: boolean;
  startDate: string | Date;
  endDate?: string | Date | null;
  standardHoursPerDay?: number | null;
  holidayWorkCountsAsOvertime?: boolean | null;
  contractType?: ContractTypeLike | null;
};

export type EmployeePayrollRulesInput = {
  salaryType?: string | null;
  benefits?: unknown;
  contractType?: ContractTypeLike | null;
  employeeContracts?: EmployeeContractLike[] | null;
};

function normalizeCategory(value?: string | null): ContractCategory {
  const v = (value || 'CUSTOM').toUpperCase();
  if (['SEISHAIN', 'KEIYAKU', 'PART', 'ARUBAITO', 'HAKKEN', 'CUSTOM'].includes(v)) {
    return v as ContractCategory;
  }
  return 'CUSTOM';
}

function normalizePayrollMode(value?: string | null): PayrollMode {
  return value === 'HOURS_ONLY' ? 'HOURS_ONLY' : 'FULL';
}

export function toContractTypeRules(ct: ContractTypeLike): ContractTypeRules {
  return {
    id: ct.id,
    name: ct.name,
    category: normalizeCategory(ct.category),
    payrollMode: normalizePayrollMode(ct.payrollMode),
    defaultSalaryType: ct.defaultSalaryType || '月給',
    overtimeMultiplier: ct.overtimeMultiplier ?? 1.25,
    socialInsuranceDefault: ct.socialInsuranceDefault ?? true,
    employmentInsuranceDefault: ct.employmentInsuranceDefault ?? true,
    workersCompDefault: ct.workersCompDefault ?? true,
    maxWeeklyHours: ct.maxWeeklyHours ?? null,
    defaultStandardHoursPerDay: ct.defaultStandardHoursPerDay ?? 8,
    defaultHolidayWorkCountsAsOvertime: ct.defaultHolidayWorkCountsAsOvertime ?? true,
    contractTemplateNotes: ct.contractTemplateNotes || '',
  };
}

export function getActiveEmployeeContractForMonth(
  contracts: EmployeeContractLike[] | null | undefined,
  month: string
): EmployeeContractLike | null {
  if (!contracts?.length) return null;
  const [year, monthVal] = month.split('-').map(Number);
  const monthStart = new Date(year, monthVal - 1, 1);
  const monthEnd = new Date(year, monthVal, 0, 23, 59, 59, 999);

  const active = contracts.find(c => {
    if (!c.isActive) return false;
    const start = new Date(c.startDate);
    const end = c.endDate ? new Date(c.endDate) : null;
    return start <= monthEnd && (!end || end >= monthStart);
  });
  return active || contracts.find(c => c.isActive) || contracts[0] || null;
}

export function resolveContractPayrollRules(
  employee: EmployeePayrollRulesInput,
  payrollMonth: string
): ResolvedPayrollRules {
  const activeContract = getActiveEmployeeContractForMonth(
    employee.employeeContracts,
    payrollMonth
  );
  const contractTypeSource = activeContract?.contractType || employee.contractType;
  const ct = contractTypeSource
    ? toContractTypeRules(contractTypeSource)
    : toContractTypeRules({
        id: 'default',
        name: 'Default',
        defaultSalaryType: employee.salaryType || '月給',
      });

  const benefits =
    employee.benefits && typeof employee.benefits === 'object'
      ? (employee.benefits as Record<string, boolean | undefined>)
      : {};
  const useInsuranceDefaults = ct.payrollMode === 'FULL';

  return {
    contractType: ct,
    salaryType: employee.salaryType || ct.defaultSalaryType,
    payrollMode: ct.payrollMode,
    overtimeMultiplier: ct.overtimeMultiplier,
    socialInsuranceEnabled: useInsuranceDefaults
      ? (benefits.healthInsurance ?? ct.socialInsuranceDefault)
      : false,
    employmentInsuranceEnabled: useInsuranceDefaults
      ? (benefits.employmentInsurance ?? ct.employmentInsuranceDefault)
      : false,
    workersCompEnabled: useInsuranceDefaults
      ? (benefits.workersComp ?? ct.workersCompDefault)
      : (benefits.workersComp ?? ct.workersCompDefault),
    standardHoursPerDay:
      activeContract?.standardHoursPerDay ?? ct.defaultStandardHoursPerDay,
    holidayWorkCountsAsOvertime:
      activeContract?.holidayWorkCountsAsOvertime ??
      ct.defaultHolidayWorkCountsAsOvertime,
  };
}