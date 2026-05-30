export function calculatePayrollDetails({
  baseSalary,
  salaryType,
  workDays,
  hourlyRate,
  dailyRate,
  overtimeHours,
  benefits
}: {
  baseSalary: number;
  salaryType: string;
  workDays: number;
  hourlyRate: number;
  dailyRate: number;
  overtimeHours: number;
  benefits: any;
}) {
  const defaults = {
    healthInsurance: true,
    pension: true,
    employmentInsurance: true,
    workersComp: true,
    transportation: 15000,
    housing: 30000,
    meal: 10000,
  };

  const b = {
    healthInsurance: benefits?.healthInsurance ?? defaults.healthInsurance,
    pension: benefits?.pension ?? defaults.pension,
    employmentInsurance: benefits?.employmentInsurance ?? defaults.employmentInsurance,
    workersComp: benefits?.workersComp ?? defaults.workersComp,
    transportation: benefits?.transportation ?? benefits?.commutingAllowance ?? defaults.transportation,
    housing: benefits?.housing ?? benefits?.housingAllowance ?? defaults.housing,
    meal: benefits?.meal ?? benefits?.mealAllowance ?? defaults.meal,
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

  const allowances = b.transportation + b.housing + b.meal;
  const totalGross = calculatedBase + overtimePay + allowances;

  // Employee deductions based on standard burden rates
  const healthInsurance = b.healthInsurance ? Math.round(totalGross * 0.05) : 0;
  const pension = b.pension ? Math.round(totalGross * 0.09) : 0;
  const employmentInsurance = b.employmentInsurance ? Math.round(totalGross * 0.003) : 0;
  const workersComp = 0; // Paid entirely by the company, employee pays 0%
  
  const incomeTax = Math.round(totalGross * 0.02);
  const residentTax = Math.round(totalGross * 0.04);

  const totalDeductions = healthInsurance + pension + employmentInsurance + workersComp + incomeTax + residentTax;
  const netSalary = totalGross - totalDeductions;

  return {
    baseSalary: calculatedBase,
    overtimePay,
    allowances,
    healthInsurance,
    pension,
    employmentInsurance,
    workersComp,
    incomeTax,
    residentTax,
    totalGross,
    totalDeductions,
    netSalary,
    workHours,
  };
}
