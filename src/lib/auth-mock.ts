export type PreferredLanguage = 'ja' | 'en' | 'vi' | 'zh';

export type Role = 'SUPER_ADMIN' | 'HR_MANAGER' | 'DEPARTMENT_MANAGER' | 'EMPLOYEE' | 'VIEWER';

export type Permission =
  | 'employees:view'
  | 'employees:edit'
  | 'employees:delete'
  | 'payroll:view'
  | 'payroll:edit'
  | 'attendance:view'
  | 'attendance:edit'
  | 'attendance:view_all_departments'
  | 'leave:view'
  | 'leave:create'
  | 'leave:approve'
  | 'reports:view'
  | 'residence_card:view'
  | 'residence_card:edit'
  | 'departments:view'
  | 'departments:edit'
  | 'settings:view'
  | 'settings:edit';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  preferredLanguage: PreferredLanguage;
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'employees:view',
    'employees:edit',
    'employees:delete',
    'payroll:view',
    'payroll:edit',
    'attendance:view',
    'attendance:edit',
    'attendance:view_all_departments',
    'leave:view',
    'leave:create',
    'leave:approve',
    'reports:view',
    'residence_card:view',
    'residence_card:edit',
    'departments:view',
    'departments:edit',
    'settings:view',
    'settings:edit',
  ],
  HR_MANAGER: [
    'employees:view',
    'employees:edit',
    'employees:delete',
    'payroll:view',
    'payroll:edit',
    'attendance:view',
    'attendance:edit',
    'leave:view',
    'leave:create',
    'leave:approve',
    'reports:view',
    'residence_card:view',
    'residence_card:edit',
    'departments:view',
    'departments:edit',
  ],
  DEPARTMENT_MANAGER: [
    'employees:view',
    'attendance:view',
    'leave:view',
    'leave:create',
    'leave:approve',
    'reports:view',
    'departments:view',
  ],
  EMPLOYEE: [
    'employees:view',
    'attendance:view',
    'leave:view',
    'leave:create',
  ],
  VIEWER: [
    'employees:view',
    'payroll:view',
    'attendance:view',
    'leave:view',
    'reports:view',
    'residence_card:view',
    'departments:view',
  ],
};

// Mock auth tạm thời: thay hàm này bằng session thật khi tích hợp NextAuth/Clerk.
export function getCurrentUser(): CurrentUser {
  const role: Role = 'SUPER_ADMIN';

  return {
    id: 'mock-user-001',
    name: 'Mock HR Manager',
    email: 'hr.manager@example.com',
    role,
    permissions: ROLE_PERMISSIONS[role],
    preferredLanguage: 'ja',
  };
}

export function hasRole(role: Role, user = getCurrentUser()): boolean {
  return user.role === role;
}

export function hasPermission(
  permission: Permission,
  user: Pick<CurrentUser, 'permissions'> = getCurrentUser()
): boolean {
  if ((user as any).role === 'SUPER_ADMIN') return true;
  return user.permissions.includes(permission);
}

export function requirePermission(permission: Permission, user = getCurrentUser()): CurrentUser {
  if (!hasPermission(permission, user)) {
    throw new Error('FORBIDDEN');
  }

  return user;
}
