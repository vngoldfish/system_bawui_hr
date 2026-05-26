const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const permissions = await prisma.permission.findMany();
  console.log("=== PERMISSIONS ===");
  console.log(JSON.stringify(permissions, null, 2));

  const rolePermissions = await prisma.rolePermission.findMany();
  console.log("=== ROLE PERMISSIONS ===");
  console.log(JSON.stringify(rolePermissions, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
