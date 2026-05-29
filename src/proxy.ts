import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, login page, and login API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/api/auth/login'
  ) {
    return NextResponse.next();
  }

  // 2. Read session_user cookie
  const cookie = request.cookies.get('session_user');
  console.log(`[PROXY] Path: ${pathname}, Has Cookie: ${!!cookie}`);
  if (!cookie) {
    console.log(`[PROXY] No cookie, redirecting or returning unauthorized`);
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 3. Parse user session and verify permissions
  try {
    const user = JSON.parse(decodeURIComponent(cookie.value));
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const effectiveRole = user.role === 'EMPLOYEE' || viewMode === 'employee' ? 'EMPLOYEE' : user.role;

    console.log(`[PROXY] User: ${user.email}, Role: ${user.role}, Effective Role: ${effectiveRole}`);
    
    // SUPER_ADMIN bypassed ONLY if not in employee mode
    if (user.role === 'SUPER_ADMIN' && viewMode !== 'employee') {
      console.log(`[PROXY] SUPER_ADMIN bypass granted`);
      return NextResponse.next();
    }

    // Detect if we need to update/sanitize the employee's cookie
    let shouldUpdateCookie = false;
    if (user.role === 'EMPLOYEE') {
      const validEmployeePermissions = ['attendance:view', 'leave:view', 'leave:create'];
      const hasDiff = !user.permissions ||
                      user.permissions.length !== validEmployeePermissions.length ||
                      user.permissions.some((p: string) => !validEmployeePermissions.includes(p));
      
      if (hasDiff) {
        user.permissions = validEmployeePermissions;
        shouldUpdateCookie = true;
        console.log(`[PROXY] Need to rewrite EMPLOYEE cookie for: ${user.email}`);
      }
    }

    let permissions = (user.permissions || []) as string[];

    if (effectiveRole === 'EMPLOYEE') {
      permissions = ['attendance:view', 'leave:view', 'leave:create'];
    }

    if (effectiveRole === 'SUPER_ADMIN' || effectiveRole === 'HR_MANAGER') {
      if (!permissions.includes('audit_logs:view')) {
        permissions.push('audit_logs:view');
      }
    }

    // 4. Enforce route guarding maps
    const guards: Record<string, string> = {
      '/roles': 'settings:view',
      '/company': 'settings:view',
      '/audit-logs': 'audit_logs:view',
      '/salary-table': 'payroll:view',
      '/payment-methods': 'payroll:view',
      '/benefits': 'payroll:view',
      '/employees': 'employees:view',
      '/departments': 'employees:view',
      '/shitens': 'employees:view',
      '/contracts': 'employees:view',
      '/recruitment': 'employees:view',
      '/residence-cards': 'residence_card:view',
      '/attendance': 'attendance:view',
      '/shift': 'attendance:view',
      '/leave': 'leave:view',
      '/reports': 'reports:view',
      '/uploads': 'employees:view',

      // Administrative API guards
      '/api/roles': 'settings:view',
      '/api/permissions': 'settings:view',
      '/api/audit-logs': 'audit_logs:view',
      '/api/holidays': 'settings:view',
      '/api/contract-types': 'employees:view',
      '/api/departments': 'employees:view',
      '/api/shitens': 'employees:view',
      '/api/positions': 'employees:view',
      '/api/employee-contracts': 'employees:view',
      '/api/employees': 'employees:view',
      '/api/upload': 'employees:view',
      '/api/payroll': 'payroll:view',
      '/api/overtime': 'attendance:view',
    };

    // Find if the path starts with a guarded path
    const matchingKey = Object.keys(guards).find(key => pathname.startsWith(key));
    if (matchingKey) {
      const requiredPermission = guards[matchingKey];
      console.log(`[PROXY] Guarded path matched: ${matchingKey}, requires: ${requiredPermission}`);
      if (!permissions.includes(requiredPermission)) {
        console.log(`[PROXY] Permission denied! User lacks ${requiredPermission}.`);
        if (pathname.startsWith('/api/')) {
          const response = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          if (shouldUpdateCookie) {
            const serializedUser = encodeURIComponent(JSON.stringify(user));
            response.cookies.set('session_user', serializedUser, { path: '/', maxAge: 28800, sameSite: 'lax', httpOnly: false });
          }
          return response;
        }
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        url.searchParams.set('error', 'forbidden');
        const response = NextResponse.redirect(url);
        if (shouldUpdateCookie) {
          const serializedUser = encodeURIComponent(JSON.stringify(user));
          response.cookies.set('session_user', serializedUser, { path: '/', maxAge: 28800, sameSite: 'lax', httpOnly: false });
        }
        return response;
      }
      console.log(`[PROXY] Permission check passed for ${matchingKey}`);
    }

    // If we need to rewrite the cookie for normal requests
    if (shouldUpdateCookie) {
      const response = NextResponse.next();
      const serializedUser = encodeURIComponent(JSON.stringify(user));
      response.cookies.set('session_user', serializedUser, { path: '/', maxAge: 28800, sameSite: 'lax', httpOnly: false });
      return response;
    }
  } catch (e) {
    console.error(`[PROXY] Error parsing user session cookie`, e);
    // If cookie parsing fails, clear session and redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    response.headers.append(
      'Set-Cookie',
      'session_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    );
    return response;
  }

  return NextResponse.next();
}

// Config matching all paths except static directories
export const config = {
  matcher: [
    '/((?!api/auth/logout|api/auth/login|static|_next/static|_next/image|favicon.ico).*)',
  ],
};
