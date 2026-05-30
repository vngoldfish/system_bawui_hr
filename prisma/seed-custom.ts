import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function removeVietnameseTones(str: string): string {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|E|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|tilde|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  str = str.replace(/\u0300|\u0301|\u0309|\u0303|\u0309/g, ""); 
  str = str.replace(/\u02C6|\u0306|\u031B/g, ""); 
  return str.replace(/[^a-zA-Z0-9]/g, "");
}

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

  // 1. Fetch or Create '現場' (Genba) Department
  let dept = await prisma.department.findFirst({ where: { name: '現場' } });
  if (!dept) {
    dept = await prisma.department.create({
      data: {
        name: '現場',
        nameKana: 'げんば',
        description: '現場業務・作業全般'
      }
    });
    console.log('Created "現場" (Genba) department in database.');
  }

  // Fetch or Create '作業員' (Worker) Position
  let pos = await prisma.position.findFirst({ where: { name: '作業員' } });
  if (!pos) {
    pos = await prisma.position.create({
      data: {
        name: '作業員',
        nameKana: 'さぎょういん',
        description: '現場作業および関連業務'
      }
    });
    console.log('Created "作業員" (Worker) position in database.');
  }

  let ct = await prisma.contractType.findFirst({ where: { name: '正社員' } });
  if (!ct) ct = await prisma.contractType.findFirst();

  if (!dept || !pos || !ct) {
    console.error('Error: Required basic contract types are missing. Please run "npm run seed:real" first to build the schema base.');
    process.exit(1);
  }

  // Clear existing custom employees (NV...) for a clean import
  console.log('Clearing existing custom employees (NV...) for a clean import...');
  await prisma.employee.deleteMany({
    where: {
      employeeCode: {
        startsWith: 'NV'
      }
    }
  });
  console.log('Cleaned up previous custom employees.');
  
  let currentNum = 0;

  for (const emp of customEmployees) {
    if (!emp.lastName || !emp.firstName) {
      console.log('Skipping record due to missing name:', emp);
      continue;
    }

    currentNum++;
    const empCode = `NV${String(currentNum).padStart(3, '0')}`;
    
    // Format birthDate to DDMMYYYY string for email
    let dateStr = '';
    if (emp.birthDate) {
      const birth = new Date(emp.birthDate);
      const day = String(birth.getDate()).padStart(2, '0');
      const month = String(birth.getMonth() + 1).padStart(2, '0');
      const year = String(birth.getFullYear());
      dateStr = `${day}${month}${year}`;
    } else {
      dateStr = String(Math.floor(100000 + Math.random() * 900000));
    }

    const cleanLastName = removeVietnameseTones(emp.lastName).toLowerCase();
    const cleanFirstName = removeVietnameseTones(emp.firstName).toLowerCase();
    const email = `${cleanLastName}${cleanFirstName}${dateStr}@gmail.com`;

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
    const issueDate = emp.residenceCardIssueDate ? new Date(emp.residenceCardIssueDate) : null;

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
        address: emp.address || '',
        hireDate: new Date(),
        salary: 280000, // Default 280,000 JPY
        salaryType: ct.defaultSalaryType || '月給',
        status: 'ACTIVE',
        role: 'EMPLOYEE',
        password: hashedPassword,
        nationality: 'ベトナム',
        residenceStatus: emp.residenceStatus || '特定技能',
        residenceCardNumber: emp.residenceCardNumber || null,
        residenceCardIssueDate: issueDate,
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
