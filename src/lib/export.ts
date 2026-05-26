export const statusMap: Record<string, string> = {
  ACTIVE: '在籍中',
  INACTIVE: '退職',
  ON_LEAVE: '休職中',
  PRESENT: '出勤',
  ABSENT: '欠勤',
  LATE: '遅刻',
  EARLY_LEAVE: '早退',
  HOLIDAY: '休暇',
  PAID: '支払い済み',
  PENDING: '未払い',
  CANCELLED: 'キャンセル',
  APPROVED: '承認済み',
  REJECTED: '却下',
};

export function translateStatus(status: string): string {
  return statusMap[status] || status;
}
