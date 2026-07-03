import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { hasPermission } from '@/lib/auth-mock';
import { getSessionUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) return errorResponse('Unauthorized', 401);

    if (!hasPermission('payroll:view', user as any)) {
      return errorResponse('Forbidden', 403);
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const records = await prisma.payrollRecord.findMany({
      where: { month },
      include: { employee: true }
    });

    const totalEmployees = records.length;
    const totalGross = records.reduce((sum, r) => sum + (r.baseSalary || 0) + (r.overtimePay || 0) + (r.bonus || 0), 0);
    const totalCompanyCost = records.reduce((sum, r) => sum + (r.totalCompanyCost || 0), 0);

    const breakdown = {
      healthInsurance: records.reduce((sum, r) => sum + (r.healthInsuranceCompany || 0), 0),
      pension: records.reduce((sum, r) => sum + (r.pensionCompany || 0), 0),
      employmentInsurance: records.reduce((sum, r) => sum + (r.employmentInsuranceCompany || 0), 0),
      workersComp: records.reduce((sum, r) => sum + (r.workersCompCompany || 0), 0),
      childRearingContribution: records.reduce((sum, r) => sum + ((r as any).childRearingContributionCompany || 0), 0),
      childRearingSupport: records.reduce((sum, r) => sum + ((r as any).childRearingSupportCompany || 0), 0),
    };

    return successResponse({
      month,
      totalEmployees,
      totalGross,
      totalCompanyCost,
      breakdown,
      records: records.map(r => ({
        employeeId: r.employeeId,
        employeeName: `${r.employee.lastName} ${r.employee.firstName}`,
        totalCompanyCost: r.totalCompanyCost,
        breakdown: {
          healthInsurance: r.healthInsuranceCompany,
          pension: r.pensionCompany,
          employmentInsurance: r.employmentInsuranceCompany,
          workersComp: r.workersCompCompany,
          childRearingContribution: (r as any).childRearingContributionCompany || 0,
          childRearingSupport: (r as any).childRearingSupportCompany || 0
        }
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}
