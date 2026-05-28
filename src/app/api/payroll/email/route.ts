import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const cookie = request.cookies.get('session_user');
    if (!cookie) {
      return errorResponse('Unauthorized', 401);
    }

    const user = JSON.parse(decodeURIComponent(cookie.value));
    const body = await request.json();
    const { payrollRecordId } = body;

    if (!payrollRecordId) {
      return errorResponse('給与明細IDが指定されていません。', 400);
    }

    // Fetch payroll record
    const record = await prisma.payrollRecord.findUnique({
      where: { id: payrollRecordId },
      include: {
        employee: {
          include: {
            department: true,
            position: true
          }
        }
      }
    });

    if (!record) {
      return errorResponse('給与明細が見つかりません。', 404);
    }

    // Security Check: Employees can only send their own payslip
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    if (isEmployeeMode && record.employeeId !== user.id) {
      return errorResponse('Forbidden', 403);
    }

    // Format fields for email
    const formatCurrency = (val: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val);
    const formatDate = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

    const [yearStr, monthStr] = record.month.split('-');
    const displayMonth = `${yearStr}年${monthStr}月`;

    // Extract benefits
    const benefits = (record.employee.benefits as any) || {};
    const transAllow = benefits.transportation || 0;
    const houseAllow = benefits.housing || 0;
    const mealAllow = benefits.meal || 0;
    const otherAllow = Math.max(0, record.bonus - transAllow - houseAllow - mealAllow);

    const healthInsurance = Math.round(record.insurance * 5 / 14.6);
    const pension = Math.round(record.insurance * 9 / 14.6);
    const employmentInsurance = Math.round(record.insurance * 0.3 / 14.6);
    const workersComp = Math.max(0, record.insurance - healthInsurance - pension - employmentInsurance);
    
    const incomeTax = Math.round(record.tax * 2 / 6);
    const residentTax = Math.max(0, record.tax - incomeTax);
    
    const totalDeductions = record.deductions + record.insurance + record.tax;
    const absenceDeduction = record.deductions;

    // Build email content
    const emailSubject = `【給与明細書】${displayMonth}度分のお知らせ (株式会社BAWUI)`;
    const emailBody = `
=========================================
【給与明細書】${displayMonth}度分
=========================================
宛先: ${record.employee.lastName} ${record.employee.firstName} 殿
従業員番号: ${record.employee.employeeCode}
所属: ${record.employee.department?.name || '未所属'} / ${record.employee.position?.name || '役職なし'}
支給日: ${formatDate(record.paymentDate)}

-----------------------------------------
■ 支給項目 (Earnings)
-----------------------------------------
  ・基本給          : ${formatCurrency(record.baseSalary)}
  ・時間外手当 (残業): ${formatCurrency(record.overtimePay)}
  ・通勤手当        : ${formatCurrency(transAllow)}
  ・住宅手当        : ${formatCurrency(houseAllow)}
  ・食事手当        : ${formatCurrency(mealAllow)}
  ${otherAllow > 0 ? `・その他手当 (賞与): ${formatCurrency(otherAllow)}` : ''}
  ---------------------------------------
  ★ 総支給額       : ${formatCurrency(record.baseSalary + record.overtimePay + record.bonus)}

-----------------------------------------
■ 控除項目 (Deductions)
-----------------------------------------
  ・健康保険料      : ${formatCurrency(healthInsurance)}
  ・厚生年金保険料  : ${formatCurrency(pension)}
  ・雇用保険料      : ${formatCurrency(employmentInsurance)}
  ・労災保険料      : ${formatCurrency(workersComp)}
  ・欠勤控除        : ${formatCurrency(absenceDeduction)}
  ・所得税          : ${formatCurrency(incomeTax)}
  ・住民税          : ${formatCurrency(residentTax)}
  ---------------------------------------
  ★ 控除合計額     : ${formatCurrency(totalDeductions)}

-----------------------------------------
■ 差引支給額 (Net Pay)
-----------------------------------------
  ★★ 銀行振込額   : ${formatCurrency(record.netSalary)}

=========================================
株式会社 BAWUI
〒100-0005 東京都千代田区丸の内1-1-1
=========================================
`;

    // Log the email representation to the server console
    console.log(`\n>>> [EMAIL SENT] >>>\nTo: ${record.employee.email}\nSubject: ${emailSubject}\nBody: ${emailBody}\n<<< [EMAIL END] <<<\n`);

    return successResponse({
      message: '給与明細を送信しました。',
      recipient: record.employee.email
    });
  } catch (error) {
    return handleApiError(error);
  }
}
