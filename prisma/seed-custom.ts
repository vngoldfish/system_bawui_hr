import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting custom employees seed...');

  const jsonPath = path.join(__dirname, 'custom-employees.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: custom-employees.json not found at ${jsonPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(jsonPath, 'utf-8');
  const customEmployees = JSON.parse(fileContent);

  if (!Array.isArray(customEmployees) || customEmployees.length === 0) {
    console.log('No employees found in custom-employees.json. Exiting.');
    return;
  }

  // 1. Fetch default Relations
  let dept = await prisma.department.findFirst({ where: { name: '開発部' } });
  if (!dept) dept = await prisma.department.findFirst();

  let pos = await prisma.position.findFirst({ where: { name: '一般社員' } });
  if (!pos) pos = await prisma.position.findFirst();

  let ct = await prisma.contractType.findFirst({ where: { name: '正社員' } });
  if (!ct) ct = await prisma.contractType.findFirst();

  if (!dept || !pos || !ct) {
    console.error('Error: Required basic departments, positions, or contract types are missing. Please run "npm run seed:real" first to build the schema base.');
    process.exit(1);
  }

  // Count existing employees with 'NV' prefix to generate next code
  const existingNVs = await prisma.employee.findMany({
    where: {
      employeeCode: {
        startsWith: 'NV'
      }
    }
  });
  
  let currentNum = existingNVs.length;

  for (const emp of customEmployees) {
    if (!emp.lastName || !emp.firstName) {
      console.log('Skipping record due to missing name:', emp);
      continue;
    }

    currentNum++;
    const empCode = `NV${String(currentNum).padStart(3, '0')}`;
    const cleanFirstName = emp.firstName.replace(/\s+/g, '');
    const email = `${emp.lastName.toLowerCase()}.${cleanFirstName.toLowerCase()}@company.jp`;

    // Check duplicate email
    const duplicate = await prisma.employee.findUnique({ where: { email } });
    if (duplicate) {
      console.log(`Employee with email ${email} already exists. Skipping.`);
      continue;
    }

    // Default password '1234@abcd'
    const defaultPassword = '1234@abcd';
    const hashedPassword = hashPassword(defaultPassword);

    const birthDate = emp.birthDate ? new Date(emp.birthDate) : null;
    const expiryDate = emp.residenceExpiry ? new Date(emp.residenceExpiry) : null;

    const phone = `080-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newEmp = await prisma.employee.create({
      data: {
        employeeCode: empCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        firstNameKana: emp.firstNameKana || '',
        lastNameKana: emp.lastNameKana || '',
        email,
        phone,
        birthDate,
        hireDate: new Date(),
        salary: 280000, // Default 280,000 JPY
        salaryType: ct.defaultSalaryType || '月給',
        status: 'ACTIVE',
        role: 'EMPLOYEE',
        password: hashedPassword,
        nationality: 'ベトナム',
        residenceStatus: '技術・人文知識・国際業務',
        residenceCardNumber: emp.residenceCardNumber || null,
        residenceExpiry: expiryDate,
        departmentId: dept.id,
        positionId: pos.id,
        contractTypeId: ct.id,
        benefits: {
          healthInsurance: true,
          pension: true,
          employmentInsurance: true,
          workersComp: true,
          transportation: 15000,
          housing: 30000,
          meal: 10000
        }
      }
    });

    // Create default employment contract
    await prisma.employeeContract.create({
      data: {
        employeeId: newEmp.id,
        contractTypeId: ct.id,
        name: `雇用契約書 - ${newEmp.lastName} ${newEmp.firstName}`,
        startDate: newEmp.hireDate,
        workDays: [1, 2, 3, 4, 5],
        standardHoursPerDay: 8,
        defaultCheckIn: '08:00',
        defaultCheckOut: '17:00',
        defaultBreakStart: '12:00',
        defaultBreakEnd: '13:00'
      }
    });

    console.log(`Created Employee: ${newEmp.lastName} ${newEmp.firstName} (${newEmp.employeeCode})`);
    console.log(`  Email: ${newEmp.email}`);
    console.log(`  Password: ${defaultPassword}`);
  }

  console.log('Custom employees seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
