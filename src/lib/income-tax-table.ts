import r8TableData from './income-tax-table-r8-data.json';

/** Một dòng trong bảng tra cứu thuế nguyệt ngạch 甲欄 */
export interface IncomeTaxBracketRow {
  amountMin: number;
  amountMax: number | null;
  /** taxes[i] = thuế cho i người phụ thuộc (0-7) */
  taxes: number[];
}

export interface IncomeTaxTableData {
  year: number;
  column: string;
  rows: IncomeTaxBracketRow[];
}

/** Giảm trừ mỗi người phụ thuộc vượt quá 7 người (theo biểu thuế NTA) */
const EXTRA_DEPENDENT_DEDUCTION = 1610;

/**
 * Tra cứu thuế thu nhập nguyệt ngạch (月額表 甲欄) theo bảng chính thức.
 * - Làm tròn xuống taxableIncome về đồng yên gần nhất
 * - Dưới 88,000円 → 0
 * - Không nội suy tuyến tính — chỉ tra cứu rời rạc theo khoảng
 */
export function lookupMonthlyIncomeTax(
  taxableIncome: number,
  dependentsCount: number,
  table: IncomeTaxTableData
): number {
  const income = Math.floor(taxableIncome);
  if (income <= 0) return 0;

  const depIndex = Math.min(Math.max(0, dependentsCount), 7);

  for (const row of table.rows) {
    const inRange =
      income >= row.amountMin &&
      (row.amountMax === null || income < row.amountMax);
    if (!inRange) continue;

    let tax = row.taxes[depIndex] ?? 0;
    if (dependentsCount > 7) {
      tax = Math.max(0, tax - (dependentsCount - 7) * EXTRA_DEPENDENT_DEDUCTION);
    }
    return tax;
  }

  return 0;
}

/** Bảng thuế R8 (2026) 月額表 甲欄 — nguồn: 国税庁 源泉徴収税額表 */
export function getR8IncomeTaxTable(): IncomeTaxTableData {
  return r8TableData as IncomeTaxTableData;
}