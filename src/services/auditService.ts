import fs from 'fs';
import path from 'path';

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

export function getAuditLogs({
  page = 1,
  limit = 20,
  action,
  model,
  startDate,
  endDate,
  search,
}: {
  page?: number;
  limit?: number;
  action?: string | null;
  model?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
}) {
  const logFilePath = path.join(process.cwd(), 'logs', 'audit.jsonl');
  let logs: AuditLogEntry[] = [];

  if (fs.existsSync(logFilePath)) {
    const fileContent = fs.readFileSync(logFilePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    // Parse in reverse order (newest first)
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const entry = JSON.parse(line);
        
        // Filter by Action (CREATE, UPDATE, DELETE)
        if (action && entry.action !== action) continue;
        
        // Filter by Model
        if (model && entry.model !== model) continue;
        
        // Filter by Date Range
        if (startDate) {
          const entryTime = new Date(entry.timestamp).getTime();
          const startLimit = new Date(startDate).getTime();
          if (entryTime < startLimit) continue;
        }
        if (endDate) {
          const entryTime = new Date(entry.timestamp).getTime();
          const endLimit = new Date(endDate);
          endLimit.setHours(23, 59, 59, 999);
          if (entryTime > endLimit.getTime()) continue;
        }
        
        // Filter by Search text (keyword in user, model, details)
        if (search) {
          const query = search.toLowerCase();
          
          let userMatch = false;
          if (typeof entry.user === 'object') {
            const uName = (entry.user.name || '').toLowerCase();
            const uEmail = (entry.user.email || '').toLowerCase();
            if (uName.includes(query) || uEmail.includes(query)) {
              userMatch = true;
            }
          } else if (typeof entry.user === 'string') {
            if (entry.user.toLowerCase().includes(query)) {
              userMatch = true;
            }
          }
          
          let detailsMatch = false;
          if (entry.details) {
            const detailsStr = JSON.stringify(entry.details).toLowerCase();
            if (detailsStr.includes(query)) {
              detailsMatch = true;
            }
          }
          
          const modelMatch = (entry.model || '').toLowerCase().includes(query);
          const actionMatch = (entry.action || '').toLowerCase().includes(query);
          
          if (!userMatch && !detailsMatch && !modelMatch && !actionMatch) continue;
        }
        
        logs.push(entry);
      } catch (e) {
        // Safe skip of malformed lines
      }
    }
  }

  const total = logs.length;
  const startIndex = (page - 1) * limit;
  const paginatedLogs = logs.slice(startIndex, startIndex + limit);

  return {
    logs: paginatedLogs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  };
}
