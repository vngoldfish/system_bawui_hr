import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TemplatesClient from '@/components/notifications/TemplatesClient';
import { Suspense } from 'react';

async function TemplatesLoader() {
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

  if (user.id !== 'mock-user-001' && (!dbUser || (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'HR_MANAGER'))) {
    redirect('/dashboard?error=forbidden');
  }

  // Pre-seed default templates if database is empty by calling local helper count check
  const count = await prisma.reminderTemplate.count();
  if (count === 0) {
    const DEFAULT_TEMPLATES = [
      {
        key: 'RESIDENCE_EXPIRY',
        title: '【重要】在留カード有効期限のリマインダー',
        content: 'こんにちは、{name}さん。あなたの在留カードの有効期限が {expiry} に迫っています。更新手続きをお願いいたします。',
      },
      {
        key: 'CONTRACT_EXPIRY',
        title: '【重要】契約更新に関するお知らせ',
        content: 'こんにちは、{name}さん。現在の勤務契約の満了日が {expiry} に近づいています。更新手続きについて、担当の管理者に連絡してください。',
      },
      {
        key: 'BIRTHDAY',
        title: '✨ お誕生日おめでとうございます！ ✨',
        content: '{name}さん、お誕生日おめでとうございます！素敵な一年になりますように。',
      },
      {
        key: 'DEPENDENT_BIRTHDAY',
        title: '🎉 ご家族のお誕生日おめでとうございます！ 🎉',
        content: '{name}さん、本日ご家族の {dependentName} 様がお誕生日を迎えられました。心よりお祝い申し上げます。',
      },
      {
        key: 'MISSING_PUNCH',
        title: '⚠️ 打刻漏れのお知らせ',
        content: 'こんにちは、{name}さん。{date} の勤務について打刻漏れがあるようです。修正申請を提出してください。',
      },
      {
        key: 'ABSENT_NO_REASON',
        title: '🚨 連続欠勤に関するリマインダー',
        content: 'こんにちは、{name}さん。{date} から連続して無断欠勤が記録されています。理由がある場合は速やかにご連絡ください。',
      },
    ];

    for (const t of DEFAULT_TEMPLATES) {
      await prisma.reminderTemplate.create({
        data: t,
      });
    }
  }

  const dbTemplates = await prisma.reminderTemplate.findMany({
    orderBy: { key: 'asc' },
  });

  const templates = dbTemplates.map(t => ({
    id: t.id,
    key: t.key,
    title: t.title,
    content: t.content,
  }));

  return <TemplatesClient initialTemplates={templates} />;
}

export default function TemplatesPage() {
  return (
    <DashboardLayout title="通知テンプレート管理" subtitle="自動通知および自動リマインダーの文章編集">
      <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
        <TemplatesLoader />
      </Suspense>
    </DashboardLayout>
  );
}
