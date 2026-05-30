import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies } from '@/lib/session';

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  clearSessionCookies(response);

  return response;
}
