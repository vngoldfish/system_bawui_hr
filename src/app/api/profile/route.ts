import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, setSessionCookies } from '@/lib/session';
import { verifyPassword, hashPassword } from '@/lib/crypto';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    if (!sessionUser) {
      return errorResponse('認証されていません。', 401);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: sessionUser.id },
      include: {
        department: true,
        position: true,
      },
    });

    if (!employee) {
      return errorResponse('ユーザーが見つかりません。', 404);
    }

    // Exclude password from response
    const { password, ...safeUser } = employee;
    return successResponse(safeUser);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    if (!sessionUser) {
      return errorResponse('認証されていません。', 401);
    }

    const body = await request.json();
    const {
      phone,
      address,
      avatar,
      language,
      residenceStatus,
      residenceCardNumber,
      residenceExpiry,
      currentPassword,
      newPassword,
    } = body;

    // Fetch current user from DB
    const employee = await prisma.employee.findUnique({
      where: { id: sessionUser.id },
    });

    if (!employee) {
      return errorResponse('ユーザーが見つかりません。', 404);
    }

    const updateData: any = {};

    // 1. Update basic details
    if (phone !== undefined) updateData.phone = typeof phone === 'string' ? phone.trim() : '';
    if (address !== undefined) updateData.address = typeof address === 'string' ? address.trim() : '';
    if (avatar !== undefined) updateData.avatar = typeof avatar === 'string' ? avatar.trim() : '';
    if (language !== undefined) {
      if (typeof language === 'string' && ['ja', 'en', 'vi', 'zh'].includes(language)) {
        updateData.language = language;
      }
    }

    // 2. Update residence card status (only if employee is not Japanese)
    if (employee.nationality !== '日本') {
      if (residenceStatus !== undefined) updateData.residenceStatus = residenceStatus;
      if (residenceCardNumber !== undefined) updateData.residenceCardNumber = typeof residenceCardNumber === 'string' ? residenceCardNumber.trim() : '';
      if (residenceExpiry !== undefined && residenceExpiry !== '') {
        updateData.residenceExpiry = new Date(residenceExpiry);
      }
    }

    // 3. Password change
    if (newPassword) {
      if (!currentPassword) {
        return errorResponse('現在のパスワードを入力してください。', 400);
      }
      if (!verifyPassword(currentPassword, employee.password)) {
        return errorResponse('現在のパスワードが正しくありません。', 400);
      }
      if (newPassword.length < 6) {
        return errorResponse('新しいパスワードは6文字以上で入力してください。', 400);
      }
      updateData.password = hashPassword(newPassword);
    }

    // Update in database
    const updatedEmployee = await prisma.employee.update({
      where: { id: sessionUser.id },
      data: updateData,
      include: {
        department: true,
        position: true,
      },
    });

    // Update session cookies to reflect language, avatar changes
    const updatedSessionUser = {
      ...sessionUser,
      language: updatedEmployee.language,
      avatar: updatedEmployee.avatar,
      nationality: updatedEmployee.nationality,
    };

    const response = successResponse({
      message: 'プロフィールを更新しました。',
      data: updatedSessionUser,
    });

    setSessionCookies(response, updatedSessionUser);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
