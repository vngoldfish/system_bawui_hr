import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

export interface AuditLogEntry {
  timestamp: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  model: string;
  recordId: string;
  details: any;
}

// Safe stringification helper that handles BigInt and Date serialization
function safeJsonStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  });
}

export function logDatabaseChange({
  request,
  action,
  model,
  recordId,
  details,
}: {
  request: NextRequest;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  model: string;
  recordId: string;
  details: any;
}) {
  let userDetails: any = 'System/Anonymous';

  try {
    const cookie = request.cookies.get('session_user');
    if (cookie) {
      const parsedUser = JSON.parse(decodeURIComponent(cookie.value));
      userDetails = {
        id: parsedUser.id || parsedUser.employeeCode || 'unknown',
        email: parsedUser.email || 'unknown',
        name: `${parsedUser.lastName || ''} ${parsedUser.firstName || ''}`.trim() || parsedUser.name || 'unknown',
        role: parsedUser.role || 'unknown',
      };
    }
  } catch (e) {
    // Fall back to System/Anonymous
  }

  const logEntry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    user: userDetails,
    action,
    model,
    recordId,
    details,
  };

  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path.join(logDir, 'audit.jsonl');
    fs.appendFileSync(logFilePath, safeJsonStringify(logEntry) + '\n', 'utf-8');
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
