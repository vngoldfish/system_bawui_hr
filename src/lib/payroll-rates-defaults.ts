import { getR8IncomeTaxTable, type IncomeTaxTableData } from './income-tax-table';

export interface RateItem {
  id: string;
  name: string;
  nameKana: string;
  companyRate: number;
  employeeRate: number;
  companyFixed: number;
  employeeFixed: number;
  type: 'rate' | 'fixed' | 'both';
  category: 'insurance' | 'tax' | 'allowance' | 'deduction';
  description: string;
}

export interface PayrollRateConfigData {
  fiscalYear: number;
  effectiveFrom: string;
  status: string;
  prefecture: string;
  healthInsuranceRate: number;
  nursingCareRate: number;
  pensionRate: number;
  employmentInsuranceEmployee: number;
  employmentInsuranceCompany: number;
  workersCompRate: number;
  incomeTaxYear: number;
  otherRates: RateItem[];
  incomeTaxTable: IncomeTaxTableData;
  sourceNotes: string;
}

/** Tỷ lệ mặc định R8 (2026) — 協会けんぽ 東京都, 雇用保険 令和7年4月〜 */
export function getDefaultOtherRates(): RateItem[] {
  return [
    {
      id: 'employment',
      name: '雇用保険',
      nameKana: 'こようほけん',
      companyRate: 0.9,
      employeeRate: 0.55,
      companyFixed: 0,
      employeeFixed: 0,
      type: 'rate',
      category: 'insurance',
      description: '一般の事業（令和7年4月〜）',
    },
    {
      id: 'workers',
      name: '労災保険',
      nameKana: 'ろうさいほけん',
      companyRate: 0.3,
      employeeRate: 0,
      companyFixed: 0,
      employeeFixed: 0,
      type: 'rate',
      category: 'insurance',
      description: '一般の事業（従業員負担なし）',
    },
    {
      id: 'resident_tax',
      name: '住民税',
      nameKana: 'じゅうみんぜい',
      companyRate: 0,
      employeeRate: 0,
      companyFixed: 0,
      employeeFixed: 0,
      type: 'fixed',
      category: 'tax',
      description: '特別徴収（前年度所得に基づく）',
    },
    {
      id: 'transport',
      name: '通勤手当',
      nameKana: 'つうきんてあて',
      companyRate: 0,
      employeeRate: 0,
      companyFixed: 15000,
      employeeFixed: 0,
      type: 'fixed',
      category: 'allowance',
      description: '定期代相当（非課税限度額15万円/月）',
    },
    {
      id: 'housing',
      name: '住宅手当',
      nameKana: 'じゅうたくてあて',
      companyRate: 0,
      employeeRate: 0,
      companyFixed: 30000,
      employeeFixed: 0,
      type: 'fixed',
      category: 'allowance',
      description: '社宅・家賃補助',
    },
    {
      id: 'meal',
      name: '食事手当',
      nameKana: 'しょくじてあて',
      companyRate: 0,
      employeeRate: 0,
      companyFixed: 10000,
      employeeFixed: 0,
      type: 'fixed',
      category: 'allowance',
      description: '昼食補助',
    },
    {
      id: 'family',
      name: '家族手当',
      nameKana: 'かぞくてあて',
      companyRate: 0,
      employeeRate: 0,
      companyFixed: 5000,
      employeeFixed: 0,
      type: 'fixed',
      category: 'allowance',
      description: '扶養家族1名あたり',
    },
    {
      id: 'overtime',
      name: '時間外手当',
      nameKana: 'じかんがいてあて',
      companyRate: 0,
      employeeRate: 0,
      companyFixed: 0,
      employeeFixed: 0,
      type: 'rate',
      category: 'allowance',
      description: '法定時間外労働（割増率25%以上）',
    },
    {
      id: 'late_night',
      name: '深夜手当',
      nameKana: 'しんやてあて',
      companyRate: 0,
      employeeRate: 0,
      companyFixed: 0,
      employeeFixed: 0,
      type: 'rate',
      category: 'allowance',
      description: '22時〜5時労働（割増率25%以上）',
    },
  ];
}

export function getDefaultPayrollRateConfig(fiscalYear: number): PayrollRateConfigData {
  return {
    fiscalYear,
    effectiveFrom: `${fiscalYear}-04-01`,
    status: 'ACTIVE',
    prefecture: '東京都',
    healthInsuranceRate: 9.98,
    nursingCareRate: 1.59,
    pensionRate: 18.3,
    employmentInsuranceEmployee: 0.55,
    employmentInsuranceCompany: 0.9,
    workersCompRate: 0.3,
    incomeTaxYear: fiscalYear,
    otherRates: getDefaultOtherRates(),
    incomeTaxTable: getR8IncomeTaxTable(),
    sourceNotes:
      '協会けんぽ東京支部 R8(2026) / 雇用保険 令和7年4月〜(一般事業 0.55%/0.9%) / 源泉徴収税額表 月額表甲欄 R8',
  };
}

/** Chuyển PayrollRateConfig DB → settings cho calculator */
export function configToRateSettings(config: {
  healthInsuranceRate: number;
  nursingCareRate: number;
  pensionRate: number;
  employmentInsuranceEmployee: number;
  employmentInsuranceCompany: number;
  workersCompRate: number;
  incomeTaxTable?: unknown;
}) {
  const table = (config.incomeTaxTable as IncomeTaxTableData | null) ?? getR8IncomeTaxTable();
  return {
    healthInsuranceRate: config.healthInsuranceRate,
    nursingCareRate: config.nursingCareRate,
    pensionRate: config.pensionRate,
    employmentInsuranceEmployeeRate: config.employmentInsuranceEmployee,
    employmentInsuranceCompanyRate: config.employmentInsuranceCompany,
    workersCompRate: config.workersCompRate,
    incomeTaxTable: table,
  };
}