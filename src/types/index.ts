// Employee Benefits
export interface EmployeeBenefits {
  healthInsurance: boolean;
  pension: boolean;
  employmentInsurance: boolean;
  workersComp: boolean;
  transportation: number;
  housing: number;
  meal: number;
}

// Dependent
export interface Dependent {
  id?: string;
  name: string;
  relationship: string;
  birthDate: string;
  gender: string;
  cohabitation: string;
}

// Education
export interface Education {
  id?: string;
  school: string;
  degree: string;
  major: string;
  graduationYear: string;
}

// Certification
export interface Certification {
  id?: string;
  name: string;
  issuer: string;
  acquiredDate: string;
  expiryDate: string;
}

// Position
export interface Position {
  id: string;
  name: string;
  nameKana: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ContractType
export interface ContractType {
  id: string;
  name: string;
  nameKana: string;
  description?: string | null;
  defaultEndDateType: string;
  defaultSalaryType: string;
  isActive: boolean;
  employeeContracts?: EmployeeContract[];
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeContract {
  id: string;
  employeeId: string;
  contractTypeId: string;
  contractType?: ContractType;
  name: string;
  startDate: string;
  endDate: string | null;
  workDays: number[];
  standardHoursPerDay: number;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultBreakStart: string;
  defaultBreakEnd: string;
  holidayWorkCountsAsOvertime: boolean;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: string;
  isPaidHoliday: boolean;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// Residence Card History
export interface ResidenceCardHistory {
  id: string;
  residenceStatus: string;
  residenceCardNumber: string;
  residenceCardIssueDate: string;
  residenceExpiry: string;
  workRestriction: string;
  updatedAt: string;
}

// Employee (canonical - matches Prisma output)
export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  lastNameKana: string;
  email: string;
  phone: string;
  birthDate: string | null;
  avatar: string | null;
  departmentId: string;
  department: Department;
  positionId: string;
  position: Position;
  hireDate: string;
  salary: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  nationality: string;
  residenceStatus: string | null;
  residenceCardNumber: string | null;
  residenceCardIssueDate: string | null;
  residenceExpiry: string | null;
  workRestriction: string | null;
  contractTypeId: string;
  contractType: ContractType;
  contractStartDate: string | null;
  contractEndDate: string | null;
  contractEndDateType: string;
  salaryType: string;
  hourlyRate: number;
  dailyRate: number;
  benefits: EmployeeBenefits | null;
  employeeContracts?: EmployeeContract[];
  dependents: Dependent[];
  education: Education[];
  certifications: Certification[];
  residenceCardHistory: ResidenceCardHistory[];
  createdAt: string;
  updatedAt: string;
}

// Attendance types
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  overtimeHours: number;
  notes: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE' | 'HOLIDAY';
  createdAt: string;
  updatedAt: string;
}

// Payroll types
export interface PayrollRecord {
  id: string;
  employeeId: string;
  employee?: Employee;
  month: string;
  baseSalary: number;
  overtimePay: number;
  bonus: number;
  deductions: number;
  tax: number;
  insurance: number;
  netSalary: number;
  paymentDate: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

// Department types
export interface Department {
  id: string;
  name: string;
  nameKana: string;
  description?: string | null;
  employees?: Employee[];
  createdAt: string;
  updatedAt: string;
}

// Overtime types
export interface OvertimeRequest {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string | null;
  approver?: Employee | null;
  createdAt: string;
  updatedAt: string;
}

// Leave types
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: Employee;
  startDate: string;
  endDate: string;
  type: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'OTHER';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string | null;
  approver?: Employee | null;
  createdAt: string;
  updatedAt: string;
}

// Dashboard stats
export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  todayAttendance: number;
  pendingOvertime: number;
  pendingLeave: number;
  monthlyPayroll: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}
