import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeCode: true,
      email: true,
      role: true,
    }
  });
  console.log('Employees:', JSON.stringify(employees, null, 2));

  const rolePermissions = await prisma.rolePermission.findMany();
  console.log('Role Permissions:', JSON.stringify(rolePermissions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
