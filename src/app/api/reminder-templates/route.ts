import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { getSessionUser } from '@/lib/session';
import { logDatabaseChange } from '@/lib/audit-logger';

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

async function seedTemplatesIfEmpty() {
  const count = await prisma.reminderTemplate.count();
  if (count === 0) {
    for (const t of DEFAULT_TEMPLATES) {
      await prisma.reminderTemplate.create({
        data: t,
      });
    }
  }
}

// GET all templates
export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    await seedTemplatesIfEmpty();

    const templates = await prisma.reminderTemplate.findMany({
      orderBy: { key: 'asc' },
    });

    return successResponse(templates);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT update a template
export async function PUT(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const { id, title, content } = body;

    if (!id || !title || !content) {
      return errorResponse('Required parameters missing', 400);
    }

    const template = await prisma.reminderTemplate.update({
      where: { id },
      data: { title, content },
    });

    logDatabaseChange({
      request,
      action: 'UPDATE',
      model: 'ReminderTemplate',
      recordId: template.id,
      details: {
        key: template.key,
        title: template.title,
      },
    });

    return successResponse(template);
  } catch (error) {
    return handleApiError(error);
  }
}
