import type { PrismaClient } from '@prisma/client';
import {
  getActiveRateConfig,
  logRateCheck,
} from './payrollRateService';
import { getDefaultPayrollRateConfig } from '@/lib/payroll-rates-defaults';

type PrismaLike = Pick<
  PrismaClient,
  'payrollRateConfig' | 'payrollRateCheckLog' | 'announcement' | 'employee'
>;

/** Tỷ lệ chính thức R7/R8 đã biết để so sánh rule-based */
const KNOWN_OFFICIAL_RATES: Record<number, {
  healthInsuranceRate: number;
  nursingCareRate: number;
  pensionRate: number;
  employmentInsuranceEmployee: number;
  employmentInsuranceCompany: number;
  workersCompRate: number;
  incomeTaxYear: number;
  source: string;
}> = {
  2025: {
    healthInsuranceRate: 9.98,
    nursingCareRate: 1.59,
    pensionRate: 18.3,
    employmentInsuranceEmployee: 0.55,
    employmentInsuranceCompany: 0.9,
    workersCompRate: 0.3,
    incomeTaxYear: 2025,
    source: '協会けんぽ東京 R7 / 雇用保険 令和7年4月〜',
  },
  2026: {
    healthInsuranceRate: 9.98,
    nursingCareRate: 1.59,
    pensionRate: 18.3,
    employmentInsuranceEmployee: 0.55,
    employmentInsuranceCompany: 0.9,
    workersCompRate: 0.3,
    incomeTaxYear: 2026,
    source: '協会けんぽ東京 R8 / 雇用保険 令和7年4月〜 / 源泉徴収税額表 R8',
  },
};

export interface RateDifference {
  field: string;
  current: number | string;
  suggested: number | string;
  note?: string;
}

export interface RateCheckResult {
  status: 'OK' | 'UPDATE_AVAILABLE' | 'ERROR';
  fiscalYear: number;
  currentRates: Record<string, unknown>;
  suggestedRates: Record<string, unknown> | null;
  differences: RateDifference[];
  checkType: string;
  aiModel?: string;
  summary: string;
  logId: string;
}

function compareRates(
  current: Record<string, unknown>,
  suggested: Record<string, unknown>
): RateDifference[] {
  const fields = [
    'healthInsuranceRate',
    'nursingCareRate',
    'pensionRate',
    'employmentInsuranceEmployee',
    'employmentInsuranceCompany',
    'workersCompRate',
    'incomeTaxYear',
  ];
  const diffs: RateDifference[] = [];
  for (const field of fields) {
    const cur = current[field];
    const sug = suggested[field];
    if (cur !== undefined && sug !== undefined && cur !== sug) {
      diffs.push({ field, current: cur as number | string, suggested: sug as number | string });
    }
  }
  return diffs;
}

function buildCurrentRatesSnapshot(config: {
  fiscalYear: number;
  prefecture: string;
  healthInsuranceRate: number;
  nursingCareRate: number;
  pensionRate: number;
  employmentInsuranceEmployee: number;
  employmentInsuranceCompany: number;
  workersCompRate: number;
  incomeTaxYear: number;
}) {
  return {
    fiscalYear: config.fiscalYear,
    prefecture: config.prefecture,
    healthInsuranceRate: config.healthInsuranceRate,
    nursingCareRate: config.nursingCareRate,
    pensionRate: config.pensionRate,
    employmentInsuranceEmployee: config.employmentInsuranceEmployee,
    employmentInsuranceCompany: config.employmentInsuranceCompany,
    workersCompRate: config.workersCompRate,
    incomeTaxYear: config.incomeTaxYear,
  };
}

async function ruleBasedCheck(
  prisma: PrismaLike,
  fiscalYear: number,
  config: Awaited<ReturnType<typeof getActiveRateConfig>>,
  userId?: string
): Promise<RateCheckResult> {
  const official = KNOWN_OFFICIAL_RATES[fiscalYear] ?? KNOWN_OFFICIAL_RATES[2026];
  const defaults = getDefaultPayrollRateConfig(fiscalYear);
  const suggestedRates = {
    ...buildCurrentRatesSnapshot(config),
    ...official,
    prefecture: config.prefecture,
    incomeTaxTableYear: official.incomeTaxYear,
    note: official.source,
  };

  const currentRates = buildCurrentRatesSnapshot(config);
  const differences = compareRates(currentRates, suggestedRates);

  const status = differences.length > 0 ? 'UPDATE_AVAILABLE' : 'OK';
  const summary =
    differences.length > 0
      ? `${differences.length}件の税率差異を検出しました（ルールベース照合）`
      : '現在の税率は既知の公式値と一致しています';

  const log = await logRateCheck(prisma, {
    configId: config.id,
    checkType: 'RULE_BASED',
    fiscalYear,
    status,
    currentRates,
    suggestedRates,
    differences,
    checkedBy: userId ?? null,
  });

  if (differences.length > 0) {
    await createRateUpdateAnnouncement(prisma, fiscalYear, differences, userId);
  }

  await prisma.payrollRateConfig.update({
    where: { id: config.id },
    data: {
      lastAiCheckAt: new Date(),
      aiCheckSummary: summary,
    },
  });

  return {
    status,
    fiscalYear,
    currentRates,
    suggestedRates: differences.length > 0 ? suggestedRates : null,
    differences,
    checkType: 'RULE_BASED',
    summary,
    logId: log.id,
  };
}

async function createRateUpdateAnnouncement(
  prisma: PrismaLike,
  fiscalYear: number,
  differences: RateDifference[],
  userId?: string
) {
  let senderId = userId;
  if (!senderId) {
    const hr = await prisma.employee.findFirst({
      where: { role: { in: ['HR_MANAGER', 'SUPER_ADMIN'] } },
      select: { id: true },
    });
    senderId = hr?.id;
  }
  if (!senderId) return;

  const diffList = differences
    .map(d => `・${d.field}: ${d.current} → ${d.suggested}`)
    .join('\n');

  await prisma.announcement.create({
    data: {
      title: `【要確認】${fiscalYear}年度 社会保険・税率の更新`,
      content: `給与計算に使用している税率設定に、最新の公式値との差異が検出されました。\n\n${diffList}\n\n給与規定表画面で最新税率を確認・適用してください。`,
      type: 'warning',
      targetType: 'ALL',
      senderId,
      showSenderName: false,
    },
  });
}

async function aiCheck(
  prisma: PrismaLike,
  fiscalYear: number,
  config: Awaited<ReturnType<typeof getActiveRateConfig>>,
  userId?: string
): Promise<RateCheckResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return ruleBasedCheck(prisma, fiscalYear, config, userId);
  }

  const prompt = `You are a Japanese payroll tax expert. Return ONLY valid JSON (no markdown) with suggested rates for fiscal year ${fiscalYear}:
{
  "healthInsuranceRate": number (total % for 協会けんぽ Tokyo),
  "nursingCareRate": number (total %),
  "pensionRate": number (total %, 厚生年金),
  "employmentInsuranceEmployee": number (%),
  "employmentInsuranceCompany": number (%),
  "workersCompRate": number (company %),
  "incomeTaxYear": number,
  "prefecture": "東京都",
  "notes": "brief source notes in Japanese"
}
Use official Japan rates. Employment insurance from April 2025 (R7): employee 0.55%, company 0.9% for general business.`;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        messages: [
          { role: 'system', content: 'Respond with JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`xAI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content ?? '';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');

    const suggested = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const currentRates = buildCurrentRatesSnapshot(config);
    const differences = compareRates(currentRates, suggested);

    const status = differences.length > 0 ? 'UPDATE_AVAILABLE' : 'OK';
    const summary =
      differences.length > 0
        ? `AIが${differences.length}件の税率更新を提案しました`
        : 'AIチェック: 現在の税率は最新と一致';

    const log = await logRateCheck(prisma, {
      configId: config.id,
      checkType: 'AI',
      fiscalYear,
      status,
      currentRates,
      suggestedRates: suggested,
      differences,
      aiModel: 'grok-3-fast',
      aiRawResponse: rawContent,
      checkedBy: userId ?? null,
    });

    if (differences.length > 0) {
      await createRateUpdateAnnouncement(prisma, fiscalYear, differences, userId);
    }

    await prisma.payrollRateConfig.update({
      where: { id: config.id },
      data: {
        lastAiCheckAt: new Date(),
        aiCheckSummary: summary,
      },
    });

    return {
      status,
      fiscalYear,
      currentRates,
      suggestedRates: differences.length > 0 ? suggested : null,
      differences,
      checkType: 'AI',
      aiModel: 'grok-3-fast',
      summary,
      logId: log.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const log = await logRateCheck(prisma, {
      configId: config.id,
      checkType: 'AI',
      fiscalYear,
      status: 'ERROR',
      currentRates: buildCurrentRatesSnapshot(config),
      aiRawResponse: message,
      checkedBy: userId ?? null,
    });

    // Fallback to rule-based on AI failure
    const fallback = await ruleBasedCheck(prisma, fiscalYear, config, userId);
    return { ...fallback, logId: log.id, summary: `AIエラー、ルールベースにフォールバック: ${message}` };
  }
}

export async function checkRatesWithAi(
  prisma: PrismaLike,
  fiscalYear?: number,
  userId?: string
): Promise<RateCheckResult> {
  const config = await getActiveRateConfig(prisma);
  const year = fiscalYear ?? config.fiscalYear;
  return aiCheck(prisma, year, config, userId);
}