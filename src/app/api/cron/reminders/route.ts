import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { getSessionUser } from '@/lib/session';

// Helper to format date cleanly in Japanese locale (Asia/Tokyo)
function formatDateJST(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    // Only SUPER_ADMIN or HR_MANAGER can trigger scanner manually
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    // Load templates
    const templates = await prisma.reminderTemplate.findMany();
    const templateMap = new Map(templates.map(t => [t.key, t]));

    const now = new Date();
    // Get local date string in Asia/Tokyo timezone
    const todayJstStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
    const todayStart = new Date(`${todayJstStr}T00:00:00+09:00`);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(todayStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: { dependents: true },
    });

    let createdCount = 0;

    for (const emp of activeEmployees) {
      const empName = `${emp.lastName} ${emp.firstName}`;

      // 1. Residence Card Expiry
      if (emp.residenceExpiry) {
        const expiry = new Date(emp.residenceExpiry);
        if (expiry >= todayStart && expiry <= thirtyDaysLater) {
          const tpl = templateMap.get('RESIDENCE_EXPIRY');
          if (tpl) {
            const title = tpl.title;
            const content = tpl.content
              .replace('{name}', empName)
              .replace('{expiry}', formatDateJST(expiry));

            // Check if already created recently
            const exists = await prisma.announcement.findFirst({
              where: {
                targetType: 'EMPLOYEE',
                targetId: emp.id,
                title: title,
                createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
              },
            });

            if (!exists) {
              await prisma.announcement.create({
                data: {
                  title,
                  content,
                  type: 'warning',
                  targetType: 'EMPLOYEE',
                  targetId: emp.id,
                  senderId: user.id,
                },
              });
              createdCount++;
            }
          }
        }
      }

      // 2. Contract Expiry
      if (emp.contractEndDate) {
        const expiry = new Date(emp.contractEndDate);
        if (expiry >= todayStart && expiry <= thirtyDaysLater) {
          const tpl = templateMap.get('CONTRACT_EXPIRY');
          if (tpl) {
            const title = tpl.title;
            const content = tpl.content
              .replace('{name}', empName)
              .replace('{expiry}', formatDateJST(expiry));

            const exists = await prisma.announcement.findFirst({
              where: {
                targetType: 'EMPLOYEE',
                targetId: emp.id,
                title: title,
                createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
              },
            });

            if (!exists) {
              await prisma.announcement.create({
                data: {
                  title,
                  content,
                  type: 'warning',
                  targetType: 'EMPLOYEE',
                  targetId: emp.id,
                  senderId: user.id,
                },
              });
              createdCount++;
            }
          }
        }
      }

      // 3. Employee Birthday
      if (emp.birthDate) {
        const bdate = new Date(emp.birthDate);
        if (bdate.getMonth() === now.getMonth() && bdate.getDate() === now.getDate()) {
          const tpl = templateMap.get('BIRTHDAY');
          if (tpl) {
            const title = tpl.title;
            const content = tpl.content.replace('{name}', empName);

            const exists = await prisma.announcement.findFirst({
              where: {
                targetType: 'EMPLOYEE',
                targetId: emp.id,
                title: title,
                createdAt: { gte: todayStart, lt: todayEnd },
              },
            });

            if (!exists) {
              await prisma.announcement.create({
                data: {
                  title,
                  content,
                  type: 'info',
                  targetType: 'EMPLOYEE',
                  targetId: emp.id,
                  senderId: user.id,
                },
              });
              createdCount++;
            }
          }
        }
      }

      // 4. Dependent Birthday
      for (const dep of emp.dependents) {
        if (dep.birthDate) {
          const bdate = new Date(dep.birthDate);
          if (bdate.getMonth() === now.getMonth() && bdate.getDate() === now.getDate()) {
            const tpl = templateMap.get('DEPENDENT_BIRTHDAY');
            if (tpl) {
              const title = tpl.title;
              const content = tpl.content
                .replace('{name}', empName)
                .replace('{dependentName}', dep.name);

              const exists = await prisma.announcement.findFirst({
                where: {
                  targetType: 'EMPLOYEE',
                  targetId: emp.id,
                  title: title,
                  createdAt: { gte: todayStart, lt: todayEnd },
                },
              });

              if (!exists) {
                await prisma.announcement.create({
                  data: {
                    title,
                    content,
                    type: 'info',
                    targetType: 'EMPLOYEE',
                    targetId: emp.id,
                    senderId: user.id,
                  },
                });
                createdCount++;
              }
            }
          }
        }
      }

      // 5. Forgotten punches (yesterday)
      const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayEnd = todayStart;
      const yesterdayRecord = await prisma.attendanceRecord.findFirst({
        where: {
          employeeId: emp.id,
          date: { gte: yesterday, lt: yesterdayEnd },
        },
      });

      if (yesterdayRecord) {
        // If they clocked in but forgot checkOut, or vice versa
        const isMissingPunch = 
          (yesterdayRecord.checkIn && !yesterdayRecord.checkOut) ||
          (!yesterdayRecord.checkIn && yesterdayRecord.checkOut) ||
          (yesterdayRecord.status === 'PRESENT' && !yesterdayRecord.checkIn);

        if (isMissingPunch) {
          const tpl = templateMap.get('MISSING_PUNCH');
          if (tpl) {
            const title = tpl.title;
            const content = tpl.content
              .replace('{name}', empName)
              .replace('{date}', formatDateJST(yesterday));

            const exists = await prisma.announcement.findFirst({
              where: {
                targetType: 'EMPLOYEE',
                targetId: emp.id,
                title: title,
                createdAt: { gte: todayStart, lt: todayEnd },
              },
            });

            if (!exists) {
              await prisma.announcement.create({
                data: {
                  title,
                  content,
                  type: 'warning',
                  targetType: 'EMPLOYEE',
                  targetId: emp.id,
                  senderId: user.id,
                },
              });
              createdCount++;
            }
          }
        }
      }

      // 6. Absent multiple days without reason (last 3 days all ABSENT)
      const threeDaysAgo = new Date(todayStart.getTime() - 3 * 24 * 60 * 60 * 1000);
      const recentAbsences = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: threeDaysAgo, lt: todayStart },
          status: 'ABSENT',
        },
      });

      if (recentAbsences.length >= 3) {
        const tpl = templateMap.get('ABSENT_NO_REASON');
        if (tpl) {
          const title = tpl.title;
          const content = tpl.content
            .replace('{name}', empName)
            .replace('{date}', formatDateJST(threeDaysAgo));

          const exists = await prisma.announcement.findFirst({
            where: {
              targetType: 'EMPLOYEE',
              targetId: emp.id,
              title: title,
              createdAt: { gte: todayStart, lt: todayEnd },
            },
          });

          if (!exists) {
            await prisma.announcement.create({
              data: {
                title,
                content,
                type: 'urgent',
                targetType: 'EMPLOYEE',
                targetId: emp.id,
                senderId: user.id,
              },
            });
            createdCount++;
          }
        }
      }
    }

    // 7. Auto-cleanup: Delete expired announcements to protect DB memory usage
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const halfYearAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // Delete normal announcements older than 30 days
    const deletedNormals = await prisma.announcement.deleteMany({
      where: {
        type: 'info',
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    // Delete warnings / average announcements older than 90 days
    const deletedWarnings = await prisma.announcement.deleteMany({
      where: {
        type: 'warning',
        createdAt: { lt: ninetyDaysAgo },
      },
    });

    // Delete urgent alerts older than 180 days
    const deletedUrgents = await prisma.announcement.deleteMany({
      where: {
        type: 'urgent',
        createdAt: { lt: halfYearAgo },
      },
    });

    return successResponse({
      success: true,
      message: `Scanner run completed. Created ${createdCount} new reminder announcements.`,
      scannedEmployees: activeEmployees.length,
      cleanup: {
        deletedNormals: deletedNormals.count,
        deletedWarnings: deletedWarnings.count,
        deletedUrgents: deletedUrgents.count,
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
