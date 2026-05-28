import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { getSessionUser } from '@/lib/session';
import { logDatabaseChange } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('認証されていません。', 401);
    }

    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const isEmployeeMode = user.role === 'EMPLOYEE' || viewMode === 'employee';
    if (isEmployeeMode) {
      // Get employee's department and position
      const emp = await prisma.employee.findUnique({
        where: { id: user.id },
        select: { departmentId: true, positionId: true }
      });

      if (!emp) {
        return successResponse([]);
      }

      // Query targeted announcements
      const announcements = await prisma.announcement.findMany({
        where: {
          OR: [
            { targetType: 'ALL' },
            { targetType: 'DEPARTMENT', targetId: emp.departmentId },
            { targetType: 'POSITION', targetId: emp.positionId },
            { targetType: 'EMPLOYEE', targetId: user.id }
          ]
        },
        include: {
          sender: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return successResponse(announcements);
    }

    // Admins see all announcements
    const announcements = await prisma.announcement.findMany({
      include: {
        sender: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return successResponse(announcements);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('認証されていません。', 401);
    }

    // Only Admin / HR can create announcements (in admin mode)
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    if (viewMode === 'employee' || (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER')) {
      return errorResponse('この操作を行う権限がありません。', 403);
    }

    const body = await request.json();
    const { title, content, type, targetType, targetId, showSenderName } = body;

    if (!title || !content) {
      return errorResponse('タイトルと内容を入力してください。', 400);
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type: type || 'info',
        targetType: targetType || 'ALL',
        targetId: targetId || null,
        showSenderName: showSenderName !== undefined ? showSenderName : true,
        senderId: user.id
      }
    });

    logDatabaseChange({
      request,
      action: 'CREATE',
      model: 'Announcement',
      recordId: announcement.id,
      details: {
        title: announcement.title,
        targetType: announcement.targetType,
        targetId: announcement.targetId,
      },
    });

    return successResponse(announcement, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
