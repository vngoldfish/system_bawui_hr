export interface PayslipDisplayConfig {
  // Info
  showEmployeeCode: boolean;
  showDeptPosition: boolean;
  showCompanyInfo: boolean;
  showPayDate: boolean;
  // Attendance
  showAttendance: boolean;
  showWorkDays: boolean;
  showAbsentDays: boolean;
  showPaidLeaveDays: boolean;
  showPrescribedHours: boolean;
  showActualHours: boolean;
  showOvertimeHours: boolean;
  // Earnings
  showOvertimePay: boolean;
  showTransportation: boolean;
  showHousing: boolean;
  showMeal: boolean;
  showOtherAllowances: boolean;
  showBonus: boolean;
  // Deductions
  showHealthInsurance: boolean;
  showNursingCare: boolean;
  showPension: boolean;
  showEmploymentIns: boolean;
  showWorkersComp: boolean;
  showAbsentDeductions: boolean;
  showIncomeTax: boolean;
  showResidentTax: boolean;
}

export const DEFAULT_PAYSLIP_DISPLAY_CONFIG: PayslipDisplayConfig = {
  showEmployeeCode: true,
  showDeptPosition: true,
  showCompanyInfo: true,
  showPayDate: true,
  showAttendance: true,
  showWorkDays: true,
  showAbsentDays: true,
  showPaidLeaveDays: true,
  showPrescribedHours: true,
  showActualHours: true,
  showOvertimeHours: true,
  showOvertimePay: true,
  showTransportation: true,
  showHousing: true,
  showMeal: true,
  showOtherAllowances: true,
  showBonus: true,
  showHealthInsurance: true,
  showNursingCare: true,
  showPension: true,
  showEmploymentIns: true,
  showWorkersComp: true,
  showAbsentDeductions: true,
  showIncomeTax: true,
  showResidentTax: true,
};

export function mergePayslipDisplayConfig(saved?: Partial<PayslipDisplayConfig> | null): PayslipDisplayConfig {
  if (!saved) return { ...DEFAULT_PAYSLIP_DISPLAY_CONFIG };
  return { ...DEFAULT_PAYSLIP_DISPLAY_CONFIG, ...saved };
}
