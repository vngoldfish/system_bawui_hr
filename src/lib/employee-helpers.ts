export type ExpiryLevel = 'expired' | 'expiring' | 'valid';

export function getExpiryStatus(expiryDate: string): { level: ExpiryLevel; daysLeft: number; label: string; colorClasses: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { level: 'expired', daysLeft, label: '期限切れ', colorClasses: 'bg-red-100 text-red-800 border-red-200' };
  }
  if (daysLeft <= 90) {
    return { level: 'expiring', daysLeft, label: `残${daysLeft}日`, colorClasses: 'bg-orange-100 text-orange-800 border-orange-200' };
  }
  return { level: 'valid', daysLeft, label: '有効', colorClasses: 'bg-green-100 text-green-800 border-green-200' };
}

export const statusColor = (s: string) =>
  s === 'ACTIVE' ? 'bg-green-100 text-green-800' :
  s === 'INACTIVE' ? 'bg-red-100 text-red-800' :
  'bg-blue-100 text-blue-800';

export const statusOptions = [
  { value: 'ACTIVE', label: '在籍中' },
  { value: 'ON_LEAVE', label: '休職中' },
  { value: 'INACTIVE', label: '退職' },
];
