	export function getHealthInsuranceSMR(income: number): number {
	  const brackets = [
	    { max: 63000, smr: 58000 },
	    { max: 73000, smr: 68000 },
	    { max: 83000, smr: 78000 },
	    { max: 93000, smr: 88000 },
	    { max: 101000, smr: 98000 },
	    { max: 107000, smr: 104000 },
	    { max: 114000, smr: 110000 },
	    { max: 122000, smr: 118000 },
	    { max: 130000, smr: 126000 },
	    { max: 138000, smr: 134000 },
	    { max: 146000, smr: 142000 },
	    { max: 155000, smr: 150000 },
	    { max: 165000, smr: 160000 },
	    { max: 175000, smr: 170000 },
	    { max: 185000, smr: 180000 },
	    { max: 195000, smr: 190000 },
	    { max: 210000, smr: 200000 },
	    { max: 230000, smr: 220000 },
	    { max: 250000, smr: 240000 },
	    { max: 270000, smr: 260000 },
	    { max: 290000, smr: 280000 },
	    { max: 310000, smr: 300000 },
	    { max: 330000, smr: 320000 },
	    { max: 350000, smr: 340000 },
	    { max: 370000, smr: 360000 },
	    { max: 395000, smr: 380000 },
	    { max: 425000, smr: 410000 },
	    { max: 455000, smr: 440000 },
	    { max: 485000, smr: 470000 },
	    { max: 515000, smr: 500000 },
	    { max: 545000, smr: 530000 },
	    { max: 575000, smr: 560000 },
	    { max: 605000, smr: 590000 },
	    { max: 635000, smr: 620000 },
	    { max: 665000, smr: 650000 },
	    { max: 695000, smr: 680000 },
	    { max: 730000, smr: 710000 },
	    { max: 770000, smr: 750000 },
	    { max: 810000, smr: 790000 },
	    { max: 855000, smr: 830000 },
	    { max: 905000, smr: 880000 },
	    { max: 955000, smr: 930000 },
	    { max: 1005000, smr: 980000 },
	    { max: 1055000, smr: 1030000 },
	    { max: 1115000, smr: 1090000 },
	    { max: 1175000, smr: 1150000 },
	    { max: 1235000, smr: 1210000 },
	    { max: 1295000, smr: 1270000 },
	    { max: 1355000, smr: 1330000 },
	  ];
	  for (const b of brackets) {
	    if (income < b.max) return b.smr;
	  }
	  return 1390000;
	}

	export function getPensionSMR(income: number): number {
	  const brackets = [
	    { max: 93000, smr: 88000 },
	    { max: 101000, smr: 98000 },
	    { max: 107000, smr: 104000 },
	    { max: 114000, smr: 110000 },
	    { max: 122000, smr: 118000 },
	    { max: 126000, smr: 122000 },
	    { max: 134000, smr: 130000 },
	    { max: 142000, smr: 138000 },
	    { max: 150000, smr: 146000 },
	    { max: 158000, smr: 150000 },
	    { max: 168000, smr: 160000 },
	    { max: 178000, smr: 170000 },
	    { max: 188000, smr: 180000 },
	    { max: 198000, smr: 190000 },
	    { max: 210000, smr: 200000 },
	    { max: 230000, smr: 220000 },
	    { max: 250000, smr: 240000 },
	    { max: 270000, smr: 260000 },
	    { max: 290000, smr: 280000 },
	    { max: 310000, smr: 300000 },
	    { max: 330000, smr: 320000 },
	    { max: 350000, smr: 340000 },
	    { max: 370000, smr: 360000 },
	    { max: 395000, smr: 380000 },
	    { max: 425000, smr: 410000 },
	    { max: 455000, smr: 440000 },
	    { max: 485000, smr: 470000 },
	    { max: 515000, smr: 500000 },
	    { max: 545000, smr: 530000 },
	    { max: 575000, smr: 560000 },
	    { max: 605000, smr: 590000 },
	    { max: 635000, smr: 620000 },
	  ];
	  for (const b of brackets) {
	    if (income < b.max) return b.smr;
	  }
	  return 650000;
	}

	export function isNursingCareApplicable(birthDateStr: string | null | undefined, targetMonthStr: string): boolean {
	  if (!birthDateStr) return false;
	  const birthDate = new Date(birthDateStr);
	  if (isNaN(birthDate.getTime())) return false;

	  const [year, month] = targetMonthStr.split('-').map(Number);
	  const targetDate = new Date(year, month - 1, 1);

	  // Ngày trước sinh nhật thứ 40
	  const dayBefore40th = new Date(birthDate);
	  dayBefore40th.setFullYear(birthDate.getFullYear() + 40);
	  dayBefore40th.setDate(dayBefore40th.getDate() - 1);

	  // Ngày trước sinh nhật thứ 65
	  const dayBefore65th = new Date(birthDate);
	  dayBefore65th.setFullYear(birthDate.getFullYear() + 65);
	  dayBefore65th.setDate(dayBefore65th.getDate() - 1);

	  // Trả về true nếu targetDate nằm trong khoảng từ tháng chứa dayBefore40th đến tháng chứa dayBefore65th
	  const targetVal = targetDate.getFullYear() * 12 + targetDate.getMonth();
	  const startVal = dayBefore40th.getFullYear() * 12 + dayBefore40th.getMonth();
	  const endVal = dayBefore65th.getFullYear() * 12 + dayBefore65th.getMonth();

	  return targetVal >= startVal && targetVal < endVal;
	}

	export function apply50SenRounding(totalPremium: number): number {
	  const half = totalPremium / 2;
	  const decimal = half - Math.floor(half);
	  if (decimal === 0.5) {
	    return Math.floor(half); // Làm tròn xuống cho phần nhân viên gánh
	  }
	  return Math.round(half); // Làm tròn thông thường
	}

	// Bảng tra cứu thuế thu nhập nguyệt ngạch (Getsugakuhyō) ước tính theo biểu thuế Cục Thuế quốc gia Nhật Bản (cột Ko)
	export function estimateIncomeTaxGetsugakuhyo(taxableIncome: number, dependentsCount: number): number {
	  if (taxableIncome < 88000) return 0;

	  // Giảm trừ thêm cho người phụ thuộc (quy đổi ra tháng)
	  const dependentAllowance = dependentsCount * 31667;
	  const adjustedIncome = Math.max(0, taxableIncome - dependentAllowance);

	  if (adjustedIncome < 88000) return 0;

	  // Lũy tiến nhanh tương đối chính xác với cột Ko nguyệt ngạch
	  if (adjustedIncome < 150000) {
	    return Math.round((adjustedIncome - 88000) * 0.05 + 1400);
	  } else if (adjustedIncome < 250000) {
	    return Math.round((adjustedIncome - 150000) * 0.07 + 4500);
	  } else if (adjustedIncome < 400000) {
	    return Math.round((adjustedIncome - 250000) * 0.10 + 11500);
	  } else if (adjustedIncome < 700000) {
	    return Math.round((adjustedIncome - 400000) * 0.15 + 26500);
	  } else {
	    return Math.round((adjustedIncome - 700000) * 0.20 + 71500);
	  }
	}

	export function calculatePayrollDetails({
  baseSalary,
  salaryType,
  workDays,
  hourlyRate,
  dailyRate,
  overtimeHours,
  benefits,
  birthDate,
  month = '2026-05',
  dependentsCount = 0,
  dependents,
  customAllowances,
  customBonus,
  prisma,
  employeeId,
  insuranceSalary,
}: {
  baseSalary: number;
  salaryType: string;
  workDays: number;
  hourlyRate: number;
  dailyRate: number;
  overtimeHours: number;
  benefits: any;
  birthDate?: string | null;
  month?: string;
  dependentsCount?: number;
  dependents?: any[];
  customAllowances?: number;
  customBonus?: number;
  prisma?: any;
  employeeId?: string;
  insuranceSalary?: number | null;
}) {
	  // Override salary from SalaryAdjustment if prisma + employeeId provided
	  if (prisma && employeeId) {
	    // Note: This is async but function is sync - caller should pre-fetch or refactor to async
	    // For now, we document that caller should pass effective rates directly
	  }

	  const defaults = {
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

	  const b = {
	    healthInsurance: benefits?.healthInsurance ?? defaults.healthInsurance,
	    pension: benefits?.pension ?? defaults.pension,
	    employmentInsurance: benefits?.employmentInsurance ?? defaults.employmentInsurance,
	    workersComp: benefits?.workersComp ?? defaults.workersComp,
	    transportation: benefits?.transportation ?? benefits?.commutingAllowance ?? defaults.transportation,
	    housing: benefits?.housing ?? benefits?.housingAllowance ?? defaults.housing,
	    meal: benefits?.meal ?? benefits?.mealAllowance ?? defaults.meal,
	    residentTax: benefits?.residentTax ?? defaults.residentTax,
	    residentTaxAmount: benefits?.residentTaxAmount ?? defaults.residentTaxAmount,
	  };

	  let calculatedBase = 0;
	  let workHours = 0;
	  const dailyHours = 8;

	  if (salaryType === '月給') {
	    calculatedBase = baseSalary;
	    workHours = workDays * dailyHours;
	  } else if (salaryType === '日給') {
	    calculatedBase = dailyRate * workDays;
	    workHours = workDays * dailyHours;
	  } else if (salaryType === '時給') {
	    const hoursPerDay = 6;
	    calculatedBase = hourlyRate * hoursPerDay * workDays;
	    workHours = hoursPerDay * workDays;
	  }

	  const hourlyEquiv = salaryType === '時給' ? hourlyRate : (workHours > 0 ? calculatedBase / workHours : 0);
	  const overtimePay = Math.round(hourlyEquiv * 1.25 * overtimeHours);

	  const baseAllowances = b.transportation + b.housing + b.meal;
	  const allowances = customAllowances !== undefined && customAllowances !== null ? customAllowances : baseAllowances;
	  const bonus = customBonus !== undefined && customBonus !== null ? customBonus : 0;
	  const totalGross = calculatedBase + overtimePay + allowances + bonus;

	  // --- LUẬT BẢO HIỂM XÃ HỘI VÀ THUẾ CHUẨN NHẬT BẢN ---

	  // 1. Tính toán Standard Monthly Remuneration (SMR)
	  // Lương tiêu chuẩn dùng để đóng bảo hiểm y tế và hưu trí
	  const smrIncome = (insuranceSalary && insuranceSalary > 0)
	    ? insuranceSalary
	    : (calculatedBase + overtimePay + allowances);
	  const healthSMR = getHealthInsuranceSMR(smrIncome);
	  const pensionSMR = getPensionSMR(smrIncome);

	  // 2. Health Insurance (健康保険): Tỷ lệ trung bình ở Tokyo là khoảng 9.98% (chia đôi -> nhân viên gánh 4.99%)
	  const healthInsuranceRate = 0.0998;
	  const totalHealthPremium = b.healthInsurance ? (healthSMR * healthInsuranceRate) : 0;
	  const healthInsurance = apply50SenRounding(totalHealthPremium);

	  // 3. Nursing Care Insurance (介護保険): Chỉ áp dụng từ 40-64 tuổi. Tỷ lệ trung bình khoảng 1.6% (chia đôi -> nhân viên gánh 0.8%)
	  const hasNursingCare = isNursingCareApplicable(birthDate, month);
	  const nursingCareRate = 0.016;
	  const totalNursingPremium = (b.healthInsurance && hasNursingCare) ? (healthSMR * nursingCareRate) : 0;
	  const nursingCarePremium = apply50SenRounding(totalNursingPremium);

	  // 4. Welfare Pension (厚生年金): Tỷ lệ cố định 18.3% (chia đôi -> nhân viên gánh 9.15%)
	  const pensionRate = 0.183;
	  const totalPensionPremium = b.pension ? (pensionSMR * pensionRate) : 0;
	  const pension = apply50SenRounding(totalPensionPremium);

	  // 5. Employment Insurance (雇用保険): Tính trên tổng thu nhập thực tế phát sinh (Gross). Tỷ lệ đóng cho nhân viên ngành phổ thông là 0.6%
	  const employmentInsuranceRate = 0.006;
	  const employmentInsurance = b.employmentInsurance ? Math.round(totalGross * employmentInsuranceRate) : 0;

	  const workersComp = 0; // Công ty đóng 100%, nhân viên đóng 0%

	  // Tổng bảo hiểm xã hội khấu trừ từ lương nhân viên
	  const totalSocialInsurance = healthInsurance + nursingCarePremium + pension + employmentInsurance;

	  // 6. Income Tax (所得税): Tính trên Gross trừ trợ cấp đi lại miễn thuế và trừ tổng bảo hiểm xã hội
	  const taxableIncome = Math.max(0, totalGross - b.transportation - totalSocialInsurance);

	  let finalDependentsCount = dependentsCount;
	  if (dependents && Array.isArray(dependents)) {
	    const [yearStr] = month.split('-');
	    const taxYear = parseInt(yearStr);
	    if (!isNaN(taxYear)) {
	      finalDependentsCount = dependents.filter((dep: any) => {
	        if (!dep.birthDate) return false;
	        const depBirthDate = new Date(dep.birthDate);
	        if (isNaN(depBirthDate.getTime())) return false;

	        // Theo luật thuế thu nhập Nhật Bản: tuổi được tính bằng (Năm tính thuế - Năm sinh)
	        return (taxYear - depBirthDate.getFullYear()) >= 16;
	      }).length;
	    }
	  }

	  const incomeTax = estimateIncomeTaxGetsugakuhyo(taxableIncome, finalDependentsCount);

	  // 7. Resident Tax (住民税): Thu hộ (特別徴収) nếu được bật, ngược lại bằng 0
	  const residentTax = b.residentTax ? b.residentTaxAmount : 0;

	  const totalDeductions = totalSocialInsurance + incomeTax + residentTax;
	  const netSalary = totalGross - totalDeductions;

	  // Company contributions
	  const companyContribs = calculateCompanyContributions({
	    healthInsurance,
	    pension,
	    employmentInsurance,
	    workersComp,
	  });

	  const nursingCareInsurance = calculateNursingCarePremium(smrIncome, birthDate, month);
	  const totalCompanyCost = totalGross + companyContribs.totalCompanyCost;

	  return {
	    baseSalary: calculatedBase,
	    overtimePay,
	    allowances,
	    bonus,
	    healthInsurance: healthInsurance + nursingCarePremium,
	    pension,
	    employmentInsurance,
	    workersComp,
	    incomeTax,
	    residentTax,
	    totalGross,
	    totalDeductions,
	    netSalary,
	    workHours,
	    healthInsuranceCompany: companyContribs.healthInsuranceCompany,
	    pensionCompany: companyContribs.pensionCompany,
	    employmentInsuranceCompany: companyContribs.employmentInsuranceCompany,
	    workersCompCompany: companyContribs.workersCompCompany,
	    healthInsuranceEmployee: healthInsurance,
	    pensionEmployee: pension,
	    employmentInsuranceEmployee: employmentInsurance,
	    nursingCareInsurance,
	    totalCompanyCost,
	  };
	}

	export async function getEffectiveSalary(
	  employeeId: string,
	  month: string,
	  prisma: any
	): Promise<{
	  baseSalary: number;
	  hourlyRate: number;
	  dailyRate: number;
	}> {
	  const adjustments = await prisma.salaryAdjustment.findMany({
	    where: {
	      employeeId,
	      effectiveFrom: { lte: month },
	    },
	    orderBy: { effectiveFrom: 'desc' },
	    take: 1,
	  });

	  if (adjustments.length > 0) {
	    const adj = adjustments[0];
	    return {
	      baseSalary: adj.newBaseSalary,
	      hourlyRate: adj.newHourlyRate,
	      dailyRate: adj.newDailyRate,
	    };
	  }

	  const employee = await prisma.employee.findUnique({
	    where: { id: employeeId },
	    select: { salary: true, hourlyRate: true, dailyRate: true },
	  });

	  return {
	    baseSalary: employee?.salary ?? 0,
	    hourlyRate: employee?.hourlyRate ?? 0,
	    dailyRate: employee?.dailyRate ?? 0,
	  };
	}

	export function calculateCompanyContributions(premiums: {
	  healthInsurance: number;
	  pension: number;
	  employmentInsurance: number;
	  workersComp: number;
	}): {
	  healthInsuranceCompany: number;
	  pensionCompany: number;
	  employmentInsuranceCompany: number;
	  workersCompCompany: number;
	  totalCompanyCost: number;
	} {
	  const healthInsuranceCompany = premiums.healthInsurance;
	  const pensionCompany = premiums.pension;
	  const employmentInsuranceCompany = Math.round(premiums.employmentInsurance * (0.85 / 0.55));
	  const workersCompCompany = premiums.workersComp;

	  const totalCompanyCost =
	    healthInsuranceCompany + pensionCompany + employmentInsuranceCompany + workersCompCompany;

	  return {
	    healthInsuranceCompany,
	    pensionCompany,
	    employmentInsuranceCompany,
	    workersCompCompany,
	    totalCompanyCost,
	  };
	}

	export function calculateNursingCarePremium(
	  income: number,
	  birthDate: string | null | undefined,
	  month: string
	): number {
	  if (!isNursingCareApplicable(birthDate, month)) return 0;
	  const rate = 0.0182;
	  const totalPremium = income * rate;
	  return apply50SenRounding(totalPremium);
	}
