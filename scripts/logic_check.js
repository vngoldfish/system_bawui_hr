import { hashPassword } from '../src/lib/crypto';
// Using built‑in fetch (Node 22+)
const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@bawui.com';
const ADMIN_PASSWORD = '1234@abcd';

async function ensureAdmin() {
  const existing = await prisma.employee.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) return existing;
  const hashed = hashPassword(ADMIN_PASSWORD);
  return await prisma.employee.create({
    data: {
      email: ADMIN_EMAIL,
      firstName: 'Test',
      lastName: 'Admin',
      employeeCode: 'NVADMIN',
      password: hashed,
      role: 'SUPER_ADMIN',
      hireDate: new Date(),
    },
  });
}

async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    redirect: 'manual',
  });
  if (!res.ok) throw new Error('Login failed: ' + res.status);
  const data = await res.json();
  const setCookie = res.headers.get('set-cookie');
  const cookie = setCookie?.split(';')[0] ?? '';
  return cookie;
}

async function createEmployee(cookie) {
  const body = {
    firstName: 'Nguyen',
    lastName: 'Van A',
    email: 'nguyenvana@example.com',
    departmentId: '', // will fill later
    positionId: '',
    contractTypeId: '',
    hireDate: '2024-01-01',
    birthDate: '1990-05-15',
  };
  // fetch required IDs
  const depRes = await fetch(`${BASE_URL}/api/departments?skip=0&take=1`, { headers: { Cookie: cookie } });
  const depData = await depRes.json();
  body.departmentId = depData.data[0]?.id ?? '';
  const posRes = await fetch(`${BASE_URL}/api/positions?skip=0&take=1`, { headers: { Cookie: cookie } });
  const posData = await posRes.json();
  body.positionId = posData.data[0]?.id ?? '';
  const ctRes = await fetch(`${BASE_URL}/api/contract-types?skip=0&take=1`, { headers: { Cookie: cookie } });
  const ctData = await ctRes.json();
  body.contractTypeId = ctData.data[0]?.id ?? '';

  const res = await fetch(`${BASE_URL}/api/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Create employee failed: ' + res.status);
  const emp = await res.json();
  return emp.data.id;
}

async function checkSync(cookie, empId) {
  const payrollRes = await fetch(`${BASE_URL}/api/payroll?employeeId=${empId}`, { headers: { Cookie: cookie } });
  const attendanceRes = await fetch(`${BASE_URL}/api/attendance?employeeId=${empId}`, { headers: { Cookie: cookie } });
  const auditRes = await fetch(`${BASE_URL}/api/audit-logs?model=Employee&recordId=${empId}`, { headers: { Cookie: cookie } });
  console.log('Payroll status:', payrollRes.status);
  console.log('Attendance status:', attendanceRes.status);
  console.log('Audit status:', auditRes.status);
  const payroll = await payrollRes.json();
  const attendance = await attendanceRes.json();
  const audit = await auditRes.json();
  console.log('Payroll data length:', payroll.data?.length ?? 0);
  console.log('Attendance data length:', attendance.data?.length ?? 0);
  console.log('Audit entries:', audit.data?.length ?? 0);
}

async function deleteEmployee(cookie, empId) {
  const res = await fetch(`${BASE_URL}/api/employees/${empId}`, { method: 'DELETE', headers: { Cookie: cookie } });
  console.log('Delete employee status:', res.status);
}

(async () => {
  try {
    await ensureAdmin();
    const cookie = await login();
    const empId = await createEmployee(cookie);
    console.log('Created employee ID:', empId);
    await checkSync(cookie, empId);
    await deleteEmployee(cookie, empId);
    // Verify deletion sync
    await checkSync(cookie, empId);
    console.log('Logic check completed');
  } catch (e) {
    console.error('Error during logic check:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
