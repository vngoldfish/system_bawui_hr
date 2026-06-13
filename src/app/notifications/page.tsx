import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NotificationsClient from '@/components/notifications/NotificationsClient';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';

async function NotificationsLoader() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  
  if (!sessionUserCookie) {
    redirect('/login');
  }
  
  let user;
  try {
    user = JSON.parse(decodeURIComponent(sessionUserCookie.value));
  } catch (e) {
    redirect('/login');
  }

  const dbUser = await prisma.employee.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    redirect('/login');
  }

  if (user.id !== 'mock-user-001' && dbUser.role === 'EMPLOYEE') {
    redirect('/dashboard?error=forbidden');
  }

  const isEmployee = false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Fetch employees: If employee, only fetch self. Otherwise active/on-leave employees.
  const employeeFilter = isEmployee 
    ? { id: user.id } 
    : { status: { in: ['ACTIVE', 'ON_LEAVE'] } };

  const employees = await prisma.employee.findMany({
    where: employeeFilter as any,
    include: {
      department: true,
      contractType: true,
    },
  });

  // 2. Fetch leave requests: If employee, fetch self. Otherwise pending only.
  const leaveFilter = isEmployee 
    ? { employeeId: user.id } 
    : { status: 'PENDING' };

  const leaves = await prisma.leaveRequest.findMany({
    where: leaveFilter as any,
    include: { employee: true },
  });

  // 3. Fetch overtime requests: If employee, fetch self. Otherwise pending only.
  const overtimeFilter = isEmployee 
    ? { employeeId: user.id } 
    : { status: 'PENDING' };

  const overtimes = await prisma.overtimeRequest.findMany({
    where: overtimeFilter as any,
    include: { employee: true },
  });

  const generatedNotifications: any[] = [];
  const todayStr = today.toISOString().split('T')[0];

  // Helper: format Date to YYYY-MM-DD
  const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

  // Helper: calculate days difference
  const getDaysLeft = (targetDate: Date) => {
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    return Math.ceil(diffMs / 86400000);
  };

  // Helper: calculate days until birthday
  const getDaysUntilBirthday = (birthDate: Date) => {
    const nextBday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBday.getTime() < today.getTime()) {
      nextBday.setFullYear(today.getFullYear() + 1);
    }
    const diff = Math.ceil((nextBday.getTime() - today.getTime()) / 86400000);
    // If birthday was in the last 7 days, return a negative number to flag it
    const pastBday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    const pastDiff = Math.ceil((today.getTime() - pastBday.getTime()) / 86400000);
    if (pastDiff >= 0 && pastDiff <= 7) {
      return -pastDiff;
    }
    return diff;
  };

  // 1. Visa Card Expiries (residence)
  employees.forEach(emp => {
    if (emp.nationality && emp.nationality !== '日本' && emp.residenceExpiry) {
      const daysLeft = getDaysLeft(emp.residenceExpiry);
      if (daysLeft <= 90) {
        const expiryDateStr = formatDateStr(emp.residenceExpiry);
        const isExpired = daysLeft < 0;
        generatedNotifications.push({
          id: `visa-${emp.id}-${expiryDateStr}`,
          type: 'residence',
          title: isExpired ? '⚠️ 在留カード期限切れ' : '🛂 在留カード期限警告',
          message: isEmployee 
            ? `あなたの在留資格「${emp.residenceStatus || '未指定'}」の期限が ${expiryDateStr} に${isExpired ? '切れています' : '満了します'}（${isExpired ? `${Math.abs(daysLeft)}日超過` : `残り ${daysLeft} 日`}）。更新サポートが必要な場合は人事担当へ連絡してください。`
            : `${emp.lastName} ${emp.firstName} の在留資格「${emp.residenceStatus || '未指定'}」の期限が ${expiryDateStr} に${isExpired ? '切れています' : '満了します'}（${isExpired ? `${Math.abs(daysLeft)}日超過` : `残り ${daysLeft} 日`}）。`,
          date: todayStr,
          priority: isExpired || daysLeft <= 30 ? 'high' : 'medium',
          read: false,
          actionUrl: '/residence-cards',
          relatedEmployee: `${emp.lastName} ${emp.firstName}`,
        });
      }
    }
  });

  // 2. Contract Expiries (contract)
  employees.forEach(emp => {
    if (emp.contractEndDate) {
      const daysLeft = getDaysLeft(emp.contractEndDate);
      if (daysLeft <= 90) {
        const endDateStr = formatDateStr(emp.contractEndDate);
        const isExpired = daysLeft < 0;
        generatedNotifications.push({
          id: `contract-${emp.id}-${endDateStr}`,
          type: 'contract',
          title: isExpired ? '⚠️ 雇用契約期限切れ' : '📋 雇用契約満了リマインダー',
          message: isEmployee 
            ? `あなたの雇用契約（${emp.contractType?.name || '無期'}）が ${endDateStr} に${isExpired ? '切れています' : '満了します'}（${isExpired ? `${Math.abs(daysLeft)}日経過` : `残り ${daysLeft} 日`}）。`
            : `${emp.lastName} ${emp.firstName} の雇用契約（${emp.contractType?.name || '無期'}）が ${endDateStr} に${isExpired ? '切れています' : '満了します'}（${isExpired ? `${Math.abs(daysLeft)}日経過` : `残り ${daysLeft} 日`}）。`,
          date: todayStr,
          priority: isExpired || daysLeft <= 30 ? 'high' : 'medium',
          read: false,
          actionUrl: '/contracts',
          relatedEmployee: `${emp.lastName} ${emp.firstName}`,
        });
      }
    }
  });

  // 3. Upcoming Birthdays (birthday)
  employees.forEach(emp => {
    if (emp.birthDate) {
      const daysDiff = getDaysUntilBirthday(emp.birthDate);
      const isSoon = daysDiff >= 0 && daysDiff <= 15;
      const isPastRecent = daysDiff < 0 && daysDiff >= -7;

      if (isSoon || isPastRecent) {
        const month = emp.birthDate.getMonth() + 1;
        const date = emp.birthDate.getDate();
        let message = '';
        let title = '🎂 誕生日リマインダー';
        if (isSoon) {
          message = isEmployee 
            ? `もうすぐあなたのお誕生日です（${month}月${date}日、あと ${daysDiff} 日）！`
            : `${emp.lastName} ${emp.firstName} のお誕生日が近づいています（${month}月${date}日、あと ${daysDiff} 日）。`;
        } else {
          title = '🎂 お誕生日おめでとうございます';
          message = isEmployee 
            ? `お誕生日おめでとうございます（${month}月${date}日、${Math.abs(daysDiff)}日前）！`
            : `昨日 ${emp.lastName} ${emp.firstName} のお誕生日でした（${month}月${date}日、${Math.abs(daysDiff)}日前）。`;
        }

        generatedNotifications.push({
          id: `birthday-${emp.id}-${today.getFullYear()}`,
          type: 'birthday',
          title,
          message,
          date: todayStr,
          priority: 'low',
          read: false,
          relatedEmployee: `${emp.lastName} ${emp.firstName}`,
        });
      }
    }
  });

  // 4. Leave Requests (general)
  leaves.forEach(req => {
    const start = formatDateStr(req.startDate);
    const end = formatDateStr(req.endDate);
    
    let title = '🏖️ 休暇申請（未承認）';
    let message = `${req.employee.lastName} ${req.employee.firstName} から休暇申請が提出されています（期間: ${start} 〜 ${end}、理由: ${req.reason}）。`;
    
    if (isEmployee) {
      const statusMap = {
        PENDING: '承認待ち',
        APPROVED: '承認済み',
        REJECTED: '却下されました',
      };
      title = `🏖️ 休暇申請（${statusMap[req.status as keyof typeof statusMap]}）`;
      message = `提出した休暇申請（期間: ${start} 〜 ${end}）は現在「${statusMap[req.status as keyof typeof statusMap]}」です。`;
    }

    generatedNotifications.push({
      id: `leave-req-${req.id}`,
      type: 'general',
      title,
      message,
      date: formatDateStr(req.createdAt),
      priority: req.status === 'PENDING' ? 'medium' : 'low',
      read: false,
      actionUrl: '/leave',
      relatedEmployee: `${req.employee.lastName} ${req.employee.firstName}`,
    });
  });

  // 5. Overtime Requests (general)
  overtimes.forEach(req => {
    const dateStr = formatDateStr(req.date);
    
    let title = '🕐 時間外勤務申請（未承認）';
    let message = `${req.employee.lastName} ${req.employee.firstName} から時間外勤務申請が提出されています（日付: ${dateStr}、時間: ${req.startTime} 〜 ${req.endTime}、理由: ${req.reason}）。`;
    
    if (isEmployee) {
      const statusMap = {
        PENDING: '承認待ち',
        APPROVED: '承認済み',
        REJECTED: '却下されました',
      };
      title = `🕐 時間外勤務申請（${statusMap[req.status as keyof typeof statusMap]}）`;
      message = `提出した時間外勤務申請（日付: ${dateStr}、時間: ${req.startTime} 〜 ${req.endTime}）は現在「${statusMap[req.status as keyof typeof statusMap]}」です。`;
    }

    generatedNotifications.push({
      id: `overtime-req-${req.id}`,
      type: 'general',
      title,
      message,
      date: formatDateStr(req.createdAt),
      priority: req.status === 'PENDING' ? 'medium' : 'low',
      read: false,
      actionUrl: '/attendance',
      relatedEmployee: `${req.employee.lastName} ${req.employee.firstName}`,
    });
  });

  // 6. Fetch database announcements
  let announcements = [];
  if (isEmployee) {
    announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { targetType: 'ALL' },
          { targetType: 'DEPARTMENT', targetId: dbUser.departmentId },
          { targetType: 'POSITION', targetId: dbUser.positionId },
          { targetType: 'EMPLOYEE', targetId: dbUser.id }
        ]
      },
      include: { sender: true },
      orderBy: { createdAt: 'desc' }
    });
  } else {
    announcements = await prisma.announcement.findMany({
      include: { sender: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 7. Append database announcements to generatedNotifications
  announcements.forEach(ann => {
    let type: 'residence' | 'contract' | 'birthday' | 'general' = 'general';
    if (ann.title.includes('在留カード') || ann.title.includes('ビザ')) {
      type = 'residence';
    } else if (ann.title.includes('契約') || ann.title.includes('雇用')) {
      type = 'contract';
    } else if (ann.title.includes('誕生日') || ann.title.includes('バースデー')) {
      type = 'birthday';
    }

    const senderName = ann.showSenderName && ann.sender 
      ? `${ann.sender.lastName} ${ann.sender.firstName}`
      : '会社';

    generatedNotifications.push({
      id: `announcement-${ann.id}`,
      type,
      title: ann.title,
      message: ann.content,
      date: formatDateStr(ann.createdAt),
      priority: ann.type === 'urgent' ? 'high' : ann.type === 'warning' ? 'medium' : 'low',
      read: false,
      relatedEmployee: ann.targetType === 'EMPLOYEE' ? '個別送信' : 
                       ann.targetType === 'DEPARTMENT' ? '部署送信' :
                       ann.targetType === 'POSITION' ? '役職送信' : '全体送信',
      showSenderName: ann.showSenderName,
      senderName: senderName,
    });
  });

  // Sort notifications by priority (high, then medium, then low) and then by title
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  generatedNotifications.sort((a, b) => {
    const pDiff = (priorityWeight[b.priority as keyof typeof priorityWeight] || 0) - 
                  (priorityWeight[a.priority as keyof typeof priorityWeight] || 0);
    if (pDiff !== 0) return pDiff;
    return a.title.localeCompare(b.title, 'ja');
  });

  return <NotificationsClient initialNotifications={generatedNotifications} />;
}

export default function NotificationsPage() {
  return (
    <DashboardLayout title="通知・リマインダー" subtitle="システム通知・リマインダー管理">
      <div className="space-y-6">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
          <NotificationsLoader />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
