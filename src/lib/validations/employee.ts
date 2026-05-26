import { z } from 'zod';

const dependentSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  birthDate: z.string().optional().nullable(),
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
  acquiredDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});

const benefitsSchema = z.object({
  healthInsurance: z.boolean().default(false),
  pension: z.boolean().default(false),
  employmentInsurance: z.boolean().default(false),
  workersComp: z.boolean().default(false),
  transportation: z.number().default(0),
  housing: z.number().default(0),
  meal: z.number().default(0),
}).optional().nullable();

export const createEmployeeSchema = z.object({
  employeeCode: z.string().optional().nullable(),
  firstName: z.string().min(1, '名は必須です'),
  lastName: z.string().min(1, '姓は必須です'),
  firstNameKana: z.string().min(1, '名（カナ）は必須です'),
  lastNameKana: z.string().min(1, '姓（カナ）は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  phone: z.string().min(1, '電話番号は必須です'),
  birthDate: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  departmentId: z.string().min(1, '部署は必須です'),
  positionId: z.string().min(1, '役職は必須です'),
  hireDate: z.string().min(1, '入社日は必須です'),
  salary: z.number().min(0, '給与は0以上である必要があります'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']).default('ACTIVE'),
  nationality: z.string().default('日本'),
  residenceStatus: z.string().optional().nullable(),
  residenceCardNumber: z.string().optional().nullable(),
  residenceCardIssueDate: z.string().optional().nullable(),
  residenceExpiry: z.string().optional().nullable(),
  workRestriction: z.string().optional().nullable(),
  contractTypeId: z.string().min(1, '雇用形態は必須です'),
  contractStartDate: z.string().optional().nullable(),
  contractEndDate: z.string().optional().nullable(),
  contractEndDateType: z.string().default('none'),
  salaryType: z.string().default('月給'),
  hourlyRate: z.number().default(0),
  dailyRate: z.number().default(0),
  benefits: benefitsSchema,
  dependents: z.array(dependentSchema).optional().default([]),
  education: z.array(educationSchema).optional().default([]),
  certifications: z.array(certificationSchema).optional().default([]),
  role: z.string().optional().default('EMPLOYEE'),
  password: z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional().default(''),
  departmentId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeQueryInput = z.infer<typeof employeeQuerySchema>;
