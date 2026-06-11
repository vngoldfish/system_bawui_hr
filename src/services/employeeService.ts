import { prisma } from '@/lib/prisma';
import type { Employee } from '@/types';

// Complete relations for detail sheets and employee forms
const employeeIncludeFull = {
  department: true,
  position: true,
  contractType: true,
  dependents: true,
  education: true,
  certifications: true,
  residenceCardHistory: true,
  shitens: true,
  employeeContracts: {
    include: { contractType: true },
    orderBy: { startDate: 'desc' as const },
  },
  salaryAdjustments: {
    orderBy: { effectiveFrom: 'desc' as const },
  },
};

// Optimized relation includes for contracts listing
const contractEmployeeInclude = {
  department: true,
  position: true,
  contractType: true,
  employeeContracts: {
    include: { contractType: true },
    orderBy: { startDate: 'desc' as const },
  },
};

// Optimized relation includes for residence cards listing
const visaEmployeeInclude = {
  department: true,
  position: true,
  contractType: true,
  residenceCardHistory: true,
  shitens: true,
};

export function serializeEmployee(emp: any): Employee {
  return {
    ...emp,
    hireDate: emp.hireDate.toISOString(),
    birthDate: emp.birthDate?.toISOString() ?? null,
    residenceCardIssueDate: emp.residenceCardIssueDate?.toISOString() ?? null,
    residenceExpiry: emp.residenceExpiry?.toISOString() ?? null,
    contractStartDate: emp.contractStartDate?.toISOString() ?? null,
    contractEndDate: emp.contractEndDate?.toISOString() ?? null,
    createdAt: emp.createdAt.toISOString(),
    updatedAt: emp.updatedAt.toISOString(),
    department: emp.department ? {
      ...emp.department,
      createdAt: emp.department.createdAt.toISOString(),
      updatedAt: emp.department.updatedAt.toISOString(),
    } : undefined,
    position: emp.position ? {
      ...emp.position,
      createdAt: emp.position.createdAt.toISOString(),
      updatedAt: emp.position.updatedAt.toISOString(),
    } : undefined,
    contractType: emp.contractType ? {
      ...emp.contractType,
      createdAt: emp.contractType.createdAt.toISOString(),
      updatedAt: emp.contractType.updatedAt.toISOString(),
    } : undefined,
    employeeContracts: emp.employeeContracts?.map((c: any) => ({
      ...c,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      contractType: c.contractType ? {
        ...c.contractType,
        createdAt: c.contractType.createdAt.toISOString(),
        updatedAt: c.contractType.updatedAt.toISOString(),
      } : undefined,
    })) || [],
    dependents: emp.dependents?.map((d: any) => ({
      ...d,
      birthDate: d.birthDate?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })) || [],
    education: emp.education?.map((e: any) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })) || [],
    certifications: emp.certifications?.map((c: any) => ({
      ...c,
      acquiredDate: c.acquiredDate?.toISOString() ?? null,
      expiryDate: c.expiryDate?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })) || [],
    residenceCardHistory: emp.residenceCardHistory?.map((h: any) => ({
      ...h,
      residenceCardIssueDate: h.residenceCardIssueDate?.toISOString() ?? null,
      residenceExpiry: h.residenceExpiry?.toISOString() ?? null,
      updatedAt: h.updatedAt.toISOString(),
    })) || [],
    shitens: emp.shitens?.map((s: any) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })) || [],
  };
}

export const employeeService = {
  async getAll(): Promise<Employee[]> {
    const employees = await prisma.employee.findMany({
      include: employeeIncludeFull,
      orderBy: { createdAt: 'desc' },
    });
    return employees.map(serializeEmployee);
  },

  async getAllSortedByContractExpiry(): Promise<Employee[]> {
    const employees = await prisma.employee.findMany({
      include: contractEmployeeInclude,
      orderBy: { contractEndDate: 'asc' },
    });
    return employees.map(serializeEmployee);
  },

  async getForeignEmployees(): Promise<Employee[]> {
    const employees = await prisma.employee.findMany({
      where: {
        nationality: { not: '日本' },
      },
      include: visaEmployeeInclude,
      orderBy: { residenceExpiry: 'asc' },
    });
    return employees.map(serializeEmployee);
  },

  async getById(id: string): Promise<Employee | null> {
    const emp = await prisma.employee.findUnique({
      where: { id },
      include: employeeIncludeFull,
    });
    if (!emp) return null;
    return serializeEmployee(emp);
  }
};
