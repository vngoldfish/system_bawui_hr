import { NextRequest } from 'next/server';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitStore>();

// Clean up old entries every 5 minutes to prevent memory leaks
if (typeof global !== 'undefined') {
  const globalAny = global as typeof globalThis & { __rateLimitInterval?: NodeJS.Timeout };
  if (!globalAny.__rateLimitInterval) {
    globalAny.__rateLimitInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of rateLimitMap.entries()) {
        if (value.resetTime < now) {
          rateLimitMap.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
}

export function isRateLimited(
  request: NextRequest,
  limit = 100, // max requests
  windowMs = 60 * 1000 // per 1 minute
): boolean {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  const path = request.nextUrl.pathname;
  const key = `${ip}:${path}`;

  const now = Date.now();
  let record = rateLimitMap.get(key);

  if (!record || record.resetTime < now) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(key, record);
    return false;
  }

  record.count++;
  if (record.count > limit) {
    return true;
  }

  return false;
}
