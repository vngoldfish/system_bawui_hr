import { z } from 'zod';

const dateRefine = (val: string | null | undefined) => {
  if (!val) return true;
  const date = new Date(val);
  if (isNaN(date.getTime())) return false;
  const year = date.getFullYear();
  return year >= 1900 && year <= 2100;
};

const dateSchema = z.string().nullable().optional().refine(dateRefine, {
  message: '年は1900年から2100年の間である必要があります (Year must be between 1900 and 2100)',
});

const requiredDateSchema = z.string().min(1, '日付は必須です').refine(dateRefine, {
  message: '年は1900年から2100年の間である必要があります (Year must be between 1900 and 2100)',
});

const dependentSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  birthDate: dateSchema,
  gender: z.string().optional().nullable(),
  cohabitation: z.string().default('同居'),
});

const educationSchema = z.object({
  school: z.string().min(1),
  degree: z.string().optional().nullable(),
  major: z.string().optional().nullable(),
  graduationYear: z.string().optional().nullable(),
});

const certificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().optional().nullable(),
  acquiredDate: dateSchema,
  expiryDate: dateSchema,
});

const benefitsSchema = z.object({
  healthInsurance: z.boolean().default(false),
  pension: z.boolean().default(false),
  employmentInsurance: z.boolean().default(false),
  workersComp: z.boolean().default(false),
  transportation: z.number().default(0),
  housing: z.number().default(0),
  meal: z.number().default(0),
  familyAllowance: z.number().default(0),
  overtimeAllowance: z.number().default(0),
  dependents: z.number().default(0),
  residentTax: z.boolean().default(false),
  residentTaxAmount: z.number().default(0),
}).optional().nullable();

export const createEmployeeSchema = z.object({
  employeeCode: z.string().optional().nullable(),
  firstName: z.string().min(1, '名は必須です'),
  lastName: z.string().min(1, '姓は必須です'),
  firstNameKana: z.string().min(1, '名（カナ）は必須です'),
  lastNameKana: z.string().min(1, '姓（カナ）は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  phone: z.string().min(1, '電話番号は必須です'),
  birthDate: dateSchema,
  avatar: z.string().optional().nullable(),
  departmentId: z.string().min(1, '部署 is required'),
  positionId: z.string().min(1, '役職 is required'),
  hireDate: requiredDateSchema,
  salary: z.number().min(0, '給与は0以上である必要があります'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']).default('ACTIVE'),
  nationality: z.string().default('日本'),
  residenceStatus: z.string().optional().nullable(),
  residenceCardNumber: z.string().optional().nullable(),
  residenceCardIssueDate: dateSchema,
  residenceExpiry: dateSchema,
  workRestriction: z.string().optional().nullable(),
  residenceCardImage: z.string().optional().nullable(),
  contractTypeId: z.string().min(1, '雇用形態 is required'),
  contractStartDate: dateSchema,
  contractEndDate: dateSchema,
  contractEndDateType: z.string().default('none'),
  salaryType: z.string().default('月給'),
  hourlyRate: z.number().default(0),
  dailyRate: z.number().default(0),
  benefits: benefitsSchema,
  insuranceSalary: z.number().optional().nullable(),
  dependents: z.array(dependentSchema).optional().default([]),
  education: z.array(educationSchema).optional().default([]),
  certifications: z.array(certificationSchema).optional().default([]),
  shitenIds: z.array(z.string()).optional().default([]),
  role: z.string().optional(),
  password: z.string().optional(),
  workDays: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  standardHoursPerDay: z.number().min(0).max(24).optional().nullable(),
  defaultCheckIn: z.string().optional().nullable(),
  defaultCheckOut: z.string().optional().nullable(),
  defaultBreakStart: z.string().optional().nullable(),
  defaultBreakEnd: z.string().optional().nullable(),
  holidayWorkCountsAsOvertime: z.boolean().optional().nullable(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
  search: z.string().optional().default(''),
  departmentId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']).optional(),
  shitenId: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeQueryInput = z.infer<typeof employeeQuerySchema>;
