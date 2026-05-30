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
  user,
}: {
  request?: NextRequest;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  model: string;
  recordId: string;
  details: any;
  user?: any;
}) {
  let userDetails: any = 'System/Anonymous';

  if (user) {
    userDetails = {
      id: user.id || 'unknown',
      email: user.email || 'unknown',
      name: `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.name || 'unknown',
      role: user.role || 'unknown',
    };
  } else if (request) {
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

    // Run expiration cleanup at most once every 24 hours
    const lastCleanupFile = path.join(logDir, '.last_cleanup');
    let shouldCleanup = false;
    const now = new Date();

    if (!fs.existsSync(lastCleanupFile)) {
      shouldCleanup = true;
    } else {
      try {
        const lastTime = new Date(fs.readFileSync(lastCleanupFile, 'utf-8').trim());
        if (now.getTime() - lastTime.getTime() > 24 * 60 * 60 * 1000) {
          shouldCleanup = true;
        }
      } catch (e) {
        shouldCleanup = true;
      }
    }

    if (shouldCleanup) {
      fs.writeFileSync(lastCleanupFile, now.toISOString(), 'utf-8');
      cleanupExpiredAuditLogs(logFilePath, 90);
    }
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

function cleanupExpiredAuditLogs(logFilePath: string, retentionDays: number = 90) {
  try {
    if (!fs.existsSync(logFilePath)) return;

    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const fileContent = fs.readFileSync(logFilePath, 'utf-8');
    const lines = fileContent.split('\n');
    const keptLines: string[] = [];
    let deletedCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const entry = JSON.parse(trimmed);
        const entryTime = new Date(entry.timestamp).getTime();
        if (entryTime >= cutoffTime) {
          keptLines.push(trimmed);
        } else {
          deletedCount++;
        }
      } catch (e) {
        // Discard malformed lines during cleanup
      }
    }

    if (deletedCount > 0) {
      fs.writeFileSync(logFilePath, keptLines.join('\n') + '\n', 'utf-8');
      console.log(`[AUDIT-LOG] Pruned ${deletedCount} expired log entries older than ${retentionDays} days.`);
    }
  } catch (err) {
    console.error('Failed to run audit log expiration cleanup:', err);
  }
}
