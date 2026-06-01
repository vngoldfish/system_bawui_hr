import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, handleApiError } from '@/lib/api-utils';
import { verifyPassword } from '@/lib/crypto';
import { setSessionCookies } from '@/lib/session';
import { isRateLimited } from '@/lib/rate-limiter';
import { logDatabaseChange } from '@/lib/audit-logger';

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

    // Lookup employee in the database
    const employee = await prisma.employee.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!employee) {
      return errorResponse('メールアドレスまたはパスワードが正しくありません。', 401);
    }

    // Verify password using cryptographically secure hashing
    if (!verifyPassword(password, employee.password)) {
      return errorResponse('メールアドレスまたはパスワードが正しくありません。', 401);
    }

    // Write login log entry to audit.jsonl
    logDatabaseChange({
      action: 'CREATE',
      model: 'Employee',
      recordId: employee.id,
      details: {
        message: 'Successful Login',
        userAgent: request.headers.get('user-agent') || 'Unknown',
        ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
      },
      user: {
        id: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role
      }
    });

    // Simulate login notification email
    const tokyoTime = new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const emailSubject = `【BAWUI Security Alert】Đăng nhập thành công / Successful Login Alert`;
    const emailBody = `
=========================================
【SECURITY NOTIFICATION】Đăng nhập thành công
=========================================
宛先: ${employee.lastName} ${employee.firstName} 殿
従業員番号: ${employee.employeeCode}

Tài khoản của bạn đã được đăng nhập thành công vào hệ thống nhân sự BAWUI.
Your account has been successfully logged into the BAWUI HR system.

- Thời gian / Time (Asia/Tokyo): ${tokyoTime}
- Địa chỉ IP / IP Address: ${request.headers.get('x-forwarded-for') || '127.0.0.1'}
- Thiết bị / Device: ${request.headers.get('user-agent') || 'Unknown'}

Nếu đây không phải là thao tác của bạn, vui lòng liên hệ với quản trị viên ngay lập tức để bảo mật tài khoản.
If you did not perform this login, please contact an administrator immediately.

=========================================
株式会社 BAWUI
=========================================
`;

    console.log(`\n>>> [EMAIL SENT] >>>\nTo: ${employee.email}\nSubject: ${emailSubject}\nBody: ${emailBody}\n<<< [EMAIL END] <<<\n`);

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
