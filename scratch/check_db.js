const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== ANNOUNCEMENTS ===");
  const announcements = await prisma.announcement.findMany({
    include: {
      sender: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });
  console.log(JSON.stringify(announcements, null, 2));

  console.log("=== EMPLOYEES ===");
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      departmentId: true,
      positionId: true
    }
  });
  console.log(JSON.stringify(employees, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
