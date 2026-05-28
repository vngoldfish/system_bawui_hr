export interface LoggedUser {
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

// Client-side helper to read and parse the session_user cookie
export function getLoggedUser(): LoggedUser | null {
  if (typeof window === 'undefined') return null;
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('session_user='))
    ?.split('=')[1];
  
  if (!cookieValue) return null;
  
  try {
    return JSON.parse(decodeURIComponent(cookieValue)) as LoggedUser;
  } catch (e) {
    return null;
  }
}

// Client-side helper to check if current user has a specific permission
export function hasClientPermission(permission: string, user = getLoggedUser()): boolean {
  if (!user) return false;
  // SUPER_ADMIN has bypass access to all features
  if (user.role === 'SUPER_ADMIN') return true;
  return user.permissions.includes(permission);
}

// Client-side helper to clear the session and redirect
export async function logoutClient() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.error('Logout API failed, clearing client cookie instead', e);
  }
  // Clear cookie manually just in case
  if (typeof window !== 'undefined') {
    document.cookie = 'session_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  }
}
