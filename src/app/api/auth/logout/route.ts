import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies } from '@/lib/session';

export async function POST(_request: NextRequest) {
  console.log('Logout route called');
  const response = NextResponse.redirect(new URL('/login', _request.url));
  clearSessionCookies(response);
  return response;
}
