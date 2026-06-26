import type { Prisma, PrismaClient } from '@prisma/client';
import {
  getDefaultPayrollRateConfig,
  type PayrollRateConfigData,
} from '@/lib/payroll-rates-defaults';
import { configToRateSettings } from '@/lib/payroll-rates-defaults';
import type { PayrollRateSettings } from '@/lib/payroll-calculator';

type PrismaLike = Pick<PrismaClient, 'payrollRateConfig' | 'payrollRateCheckLog'>;

export function isRateConfigStale(config: {
  fiscalYear: number;
  lastVerifiedAt: Date | null;
}): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (config.fiscalYear < currentYear) return true;
  if (currentMonth >= 4 && config.fiscalYear < currentYear) return true;
  if (currentMonth > 3 && config.fiscalYear === currentYear - 1) return true;

  if (!config.lastVerifiedAt) return true;

  const elevenMonthsAgo = new Date(now);
  elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
  if (config.lastVerifiedAt < elevenMonthsAgo) return true;

  return false;
}

export async function getActiveRateConfig(prisma: PrismaLike) {
  let config = await prisma.payrollRateConfig.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { fiscalYear: 'desc' },
  });

  if (!config) {
    const fiscalYear = new Date().getFullYear();
    const defaults = getDefaultPayrollRateConfig(fiscalYear);
    try {
      config = await prisma.payrollRateConfig.create({
        data: {
          fiscalYear: defaults.fiscalYear,
          effectiveFrom: defaults.effectiveFrom,
          status: 'ACTIVE',
          prefecture: defaults.prefecture,
          healthInsuranceRate: defaults.healthInsuranceRate,
          nursingCareRate: defaults.nursingCareRate,
          pensionRate: defaults.pensionRate,
          employmentInsuranceEmployee: defaults.employmentInsuranceEmployee,
          employmentInsuranceCompany: defaults.employmentInsuranceCompany,
          workersCompRate: defaults.workersCompRate,
          incomeTaxYear: defaults.incomeTaxYear,
          otherRates: defaults.otherRates as unknown as Prisma.InputJsonValue,
          incomeTaxTable: defaults.incomeTaxTable as unknown as Prisma.InputJsonValue,
          sourceNotes: defaults.sourceNotes,
          lastVerifiedAt: new Date(),
          changeLog: [] as Prisma.InputJsonValue,
        },
      });
    } catch {
      // Race: another request may have seeded already
      config = await prisma.payrollRateConfig.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { fiscalYear: 'desc' },
      });
      if (!config) throw new Error('Failed to seed payroll rate config');
    }
  }

  return config;
}

export function toPayrollRateSettings(config: {
  healthInsuranceRate: number;
  nursingCareRate: number;
  pensionRate: number;
  employmentInsuranceEmployee: number;
  employmentInsuranceCompany: number;
  workersCompRate: number;
  incomeTaxTable?: unknown;
}): PayrollRateSettings {
  return configToRateSettings(config);
}

export async function archiveAndActivateConfig(
  prisma: PrismaLike,
  newConfigData: Partial<PayrollRateConfigData> & { fiscalYear: number }
) {
  const existing = await prisma.payrollRateConfig.findFirst({
    where: { status: 'ACTIVE' },
  });

  if (existing) {
    await prisma.payrollRateConfig.update({
      where: { id: existing.id },
      data: { status: 'ARCHIVED' },
    });
  }

  const defaults = getDefaultPayrollRateConfig(newConfigData.fiscalYear);
  const merged = { ...defaults, ...newConfigData, status: 'ACTIVE' };

  return prisma.payrollRateConfig.create({
    data: {
      fiscalYear: merged.fiscalYear,
      effectiveFrom: merged.effectiveFrom,
      status: 'ACTIVE',
      prefecture: merged.prefecture,
      healthInsuranceRate: merged.healthInsuranceRate,
      nursingCareRate: merged.nursingCareRate,
      pensionRate: merged.pensionRate,
      employmentInsuranceEmployee: merged.employmentInsuranceEmployee,
      employmentInsuranceCompany: merged.employmentInsuranceCompany,
      workersCompRate: merged.workersCompRate,
      incomeTaxYear: merged.incomeTaxYear,
      otherRates: merged.otherRates as unknown as Prisma.InputJsonValue,
      incomeTaxTable: merged.incomeTaxTable as unknown as Prisma.InputJsonValue,
      sourceNotes: merged.sourceNotes,
      lastVerifiedAt: new Date(),
      changeLog: [] as Prisma.InputJsonValue,
    },
  });
}

export async function logRateCheck(
  prisma: PrismaLike,
  data: {
    configId?: string | null;
    checkType: string;
    fiscalYear: number;
    status: string;
    currentRates?: unknown;
    suggestedRates?: unknown;
    differences?: unknown;
    aiModel?: string | null;
    aiRawResponse?: string | null;
    checkedBy?: string | null;
  }
) {
  return prisma.payrollRateCheckLog.create({
    data: {
      configId: data.configId ?? null,
      checkType: data.checkType,
      fiscalYear: data.fiscalYear,
      status: data.status,
      currentRates: (data.currentRates ?? undefined) as Prisma.InputJsonValue | undefined,
      suggestedRates: (data.suggestedRates ?? undefined) as Prisma.InputJsonValue | undefined,
      differences: (data.differences ?? undefined) as Prisma.InputJsonValue | undefined,
      aiModel: data.aiModel ?? null,
      aiRawResponse: data.aiRawResponse ?? null,
      checkedBy: data.checkedBy ?? null,
    },
  });
}

export function getRateStatusMessage(config: {
  fiscalYear: number;
  lastVerifiedAt: Date | null;
  lastAiCheckAt: Date | null;
}): { isStale: boolean; message: string; daysSinceVerified: number | null } {
  const isStale = isRateConfigStale(config);
  const daysSinceVerified = config.lastVerifiedAt
    ? Math.floor((Date.now() - config.lastVerifiedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let message = `令和${config.fiscalYear - 2018}年度（${config.fiscalYear}）の税率設定が有効です。`;
  if (isStale) {
    message = `税率設定が古い可能性があります（${config.fiscalYear}年度）。最新の協会けんぽ・雇用保険率を確認してください。`;
  }

  return { isStale, message, daysSinceVerified };
}