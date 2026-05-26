const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const records = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 86400000)
        }
      },
      include: { employee: true }
    });
    console.log(`Attendance records for today (${today.toISOString().split('T')[0]}): ${records.length}`);
    for (const r of records) {
      console.log(`Employee: ${r.employee.lastName} ${r.employee.firstName}, Status: ${r.status}, checkIn: ${r.checkIn}, checkOut: ${r.checkOut}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
