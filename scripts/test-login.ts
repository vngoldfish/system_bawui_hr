import { PrismaClient } from '@prisma/client';
import { verifyPassword, hashPassword } from '../src/lib/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing admin login...\n');

  const email = 'admin@bawui.com';
  const password = '1234@abcd';

  // 1. Check if employee exists
  const employee = await prisma.employee.findUnique({
    where: { email },
  });

  if (!employee) {
    console.log('❌ Employee NOT FOUND in database');
    console.log('   Run: npm run seed:real');
    return;
  }

  console.log('✅ Employee found:');
  console.log('   Email:', employee.email);
  console.log('   Role:', employee.role);
  console.log('   Password field:', employee.password ? 'EXISTS' : 'NULL');
  console.log('   Password format:', employee.password?.includes(':') ? 'VALID' : 'INVALID');
  console.log('');

  // 2. Test password verification
  if (employee.password) {
    console.log('🔐 Testing password verification...');
    const isValid = await verifyPassword(password, employee.password);
    console.log('   Input password:', password);
    console.log('   Verification result:', isValid ? '✅ VALID' : '❌ INVALID');
    console.log('');

    if (!isValid) {
      console.log('⚠️  Password mismatch! Re-hashing...');
      const newHash = await hashPassword(password);
      console.log('   New hash:', newHash);
      console.log('');
      console.log('💡 Update password in DB:');
      console.log(`   UPDATE employees SET password = '${newHash}' WHERE email = '${email}';`);
    }
  }

  console.log('');
  console.log('📊 Summary:');
  console.log('   Email exists:', !!employee);
  console.log('   Role is SUPER_ADMIN:', employee.role === 'SUPER_ADMIN');
  console.log('   Password valid:', employee.password && await verifyPassword(password, employee.password));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
