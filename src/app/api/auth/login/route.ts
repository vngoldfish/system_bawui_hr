import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { verifyPassword } from '@/lib/crypto';
import { setSessionCookies } from '@/lib/session';
import { isRateLimited } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(request, 5, 60 * 1000)) {
      return errorResponse('リクエストが多すぎます。しばらく時間をおいてから再度お試しください。', 429);
    }
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('メールアドレスとパスワードを入力してください。', 400);
    }

    console.log('[LOGIN DEBUG] Request email:', email, 'password:', password);
    // Lookup employee in the database
    const employee = await prisma.employee.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    console.log('[LOGIN DEBUG] Found employee:', employee ? employee.email : 'not found');
    if (employee) {
      console.log('[LOGIN DEBUG] Verification result:', verifyPassword(password, employee.password));
    }

    if (!employee) {
      return errorResponse('メールアドレスまたはパスワードが正しくありません。', 401);
    }

    // Verify password using cryptographically secure hashing
    if (!verifyPassword(password, employee.password)) {
      return errorResponse('メールアドレスまたはパスワードが正しくありません。', 401);
    }

    // Query permissions from RolePermission table for this role in real-time
    const rpMappings = await prisma.rolePermission.findMany({
      where: { role: employee.role },
      select: { permission: true },
    });
    
    const permissions = rpMappings.map(rp => rp.permission);

    // Build session user payload
    const sessionUser = {
      id: employee.id,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role,
      permissions,
      avatar: employee.avatar || '',
      language: employee.language || 'ja',
      nationality: employee.nationality || '日本',
    };

    // Serialize and set cookie
    const response = NextResponse.json({
      success: true,
      data: sessionUser,
    });

    setSessionCookies(response, sessionUser);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
