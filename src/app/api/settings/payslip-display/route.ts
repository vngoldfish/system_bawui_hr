import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { logDatabaseChange } from '@/lib/audit-logger';
import { getSessionUser } from '@/lib/session';
import { mergePayslipDisplayConfig } from '@/lib/payslip-display-config';

const configSchema = z.object({
  showEmployeeCode: z.boolean().optional(),
  showDeptPosition: z.boolean().optional(),
  showCompanyInfo: z.boolean().optional(),
  showPayDate: z.boolean().optional(),
  showAttendance: z.boolean().optional(),
  showWorkDays: z.boolean().optional(),
  showAbsentDays: z.boolean().optional(),
  showPaidLeaveDays: z.boolean().optional(),
  showPrescribedHours: z.boolean().optional(),
  showActualHours: z.boolean().optional(),
  showOvertimeHours: z.boolean().optional(),
  showOvertimePay: z.boolean().optional(),
  showTransportation: z.boolean().optional(),
  showHousing: z.boolean().optional(),
  showMeal: z.boolean().optional(),
  showOtherAllowances: z.boolean().optional(),
  showBonus: z.boolean().optional(),
  showHealthInsurance: z.boolean().optional(),
  showNursingCare: z.boolean().optional(),
  showPension: z.boolean().optional(),
  showEmploymentIns: z.boolean().optional(),
  showWorkersComp: z.boolean().optional(),
  showAbsentDeductions: z.boolean().optional(),
  showIncomeTax: z.boolean().optional(),
  showResidentTax: z.boolean().optional(),
});

export async function GET(_request: NextRequest) {
  try {
    const company = await prisma.company.findFirst();
    const config = mergePayslipDisplayConfig(company?.payslipDisplayConfig as any);
    return successResponse(config);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const data = configSchema.parse(body);

    let company = await prisma.company.findFirst();

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: '株式会社ロング',
          nameKana: 'カブシキガイシャロング',
          representative: 'ロン グエン',
          representativeTitle: '代表取締役',
          established: '2015-04-01',
          capital: '10,000,000円',
          employees: '14名',
          industry: 'IT・ソフトウェア',
          registrationNumber: 'T1234567890123',
          address: '〒100-0001 東京都千代田区千代田1-1-1 ロングビル3F',
          phone: '03-1234-5678',
          fax: '03-1234-5679',
          email: 'info@long-corp.jp',
          website: 'https://www.long-corp.jp',
          bankName: '三菱UFJ銀行',
          branchName: '東京支店',
          accountType: '普通',
          accountNumber: '1234567',
          accountHolder: 'カブシキガイシャロング',
          roundingPolicy: 'exact',
          salaryCutoffDay: '末日',
          payday: '25',
          healthInsuranceRate: 9.98,
          payslipDisplayConfig: data,
        },
      });
    } else {
      const currentConfig = company.payslipDisplayConfig ? (company.payslipDisplayConfig as any) : {};
      const updatedConfig = { ...currentConfig, ...data };
      company = await prisma.company.update({
        where: { id: company.id },
        data: {
          payslipDisplayConfig: updatedConfig,
        },
      });
    }

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'Company',
      recordId: company.id,
      details: { payslipDisplayConfig: company.payslipDisplayConfig },
    });

    const config = mergePayslipDisplayConfig(company.payslipDisplayConfig as any);
    return successResponse(config);
  } catch (error) {
    return handleApiError(error);
  }
}
