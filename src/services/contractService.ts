import { prisma } from '@/lib/prisma';

export const contractService = {
  async getActiveContractForEmployee(employeeId: string) {
    return prisma.employeeContract.findFirst({
      where: {
        employeeId,
        isActive: true,
      },
      include: {
        contractType: true,
      },
    });
  },

  async saveContractSchedule(payload: {
    id?: string;
    employeeId: string;
    contractTypeId: string;
    name: string;
    startDate: Date;
    endDate: Date | null;
    workDays: number[];
    standardHoursPerDay: number;
    defaultCheckIn: string;
    defaultCheckOut: string;
    defaultBreakStart: string;
    defaultBreakEnd: string;
    holidayWorkCountsAsOvertime: boolean;
  }) {
    const { id, ...data } = payload;
    if (id) {
      return prisma.employeeContract.update({
        where: { id },
        data,
        include: { contractType: true },
      });
    }
    return prisma.employeeContract.create({
      data,
      include: { contractType: true },
    });
  }
};
