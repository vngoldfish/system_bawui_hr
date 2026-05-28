import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const SECRET = process.env.SESSION_SECRET || 'company-internal-highly-secure-default-key-9876543210';

export interface SessionUser {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissions: string[];
  avatar?: string;
  language?: string;
  nationality?: string;
}

export function signToken(payload: any): string {
  const data = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
  return `${Buffer.from(data).toString('base64')}.${signature}`;
}

export function verifyToken(token: string): any | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [base64Payload, signature] = parts;
  try {
    const data = Buffer.from(base64Payload, 'base64').toString('utf8');
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
    
    // Convert both to buffers of matching length for secure timingSafeEqual comparison
    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    
    if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return JSON.parse(data);
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

export function getSessionUser(request: NextRequest): SessionUser | null {
  const tokenCookie = request.cookies.get('session_token');
  if (!tokenCookie) return null;
  return verifyToken(tokenCookie.value) as SessionUser | null;
}

export function setSessionCookies(response: NextResponse, user: any) {
  const token = signToken(user);
  
  // Set HttpOnly signed cookie for secure API access
  response.headers.append(
    'Set-Cookie',
    `session_token=${token}; Path=/; Max-Age=28800; SameSite=Lax; HttpOnly`
  );

  // Set plain JSON cookie for Client UI loading
  const serializedUser = encodeURIComponent(JSON.stringify(user));
  response.headers.append(
    'Set-Cookie',
    `session_user=${serializedUser}; Path=/; Max-Age=28800; SameSite=Lax`
  );
}

export function clearSessionCookies(response: NextResponse) {
  response.headers.append(
    'Set-Cookie',
    'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly'
  );
  response.headers.append(
    'Set-Cookie',
    'session_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  );
}
