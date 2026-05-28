import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { getAuditLogs } from '@/services/auditService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    
    // Check permission
    const viewMode = request.cookies.get('view_mode')?.value || 'admin';
    const effectiveRole = user.role === 'EMPLOYEE' || viewMode === 'employee' ? 'EMPLOYEE' : user.role;
    const isAuthorized = effectiveRole === 'SUPER_ADMIN' || effectiveRole === 'HR_MANAGER';
    if (!isAuthorized) {
      return errorResponse('Forbidden', 403);
    }

    // Get query parameters
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const action = searchParams.get('action');
    const model = searchParams.get('model');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const result = getAuditLogs({
      page,
      limit,
      action,
      model,
      startDate,
      endDate,
      search,
    });

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
