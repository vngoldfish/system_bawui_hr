const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        department: true,
        position: true,
        contractType: true,
        employeeContracts: true,
      }
    });
    console.log(`Total employees in DB: ${employees.length}`);
    if (employees.length > 0) {
      console.log('Sample Employee Code:', employees[0].employeeCode);
      console.log('Sample Employee Contracts count:', employees[0].employeeContracts.length);
    }
    
    const depts = await prisma.department.findMany();
    console.log(`Total departments: ${depts.length}`);
    
    const positions = await prisma.position.findMany();
    console.log(`Total positions: ${positions.length}`);
    
    const contractTypes = await prisma.contractType.findMany();
    console.log(`Total contract types: ${contractTypes.length}`);
  } catch (error) {
    console.error('Error querying DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
