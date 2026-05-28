'use client';

import { ReactNode, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useI18n } from '@/lib/i18n';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const titleMap: Record<string, string> = {
  '\u30de\u30a4\u30a2\u30ab\u30a6\u30f3\u30c8': 'nav.myAccount',
  '\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9': 'nav.dashboard',
  '\u52e4\u6020\u7ba1\u7406': 'nav.attendance',
  '\u4f11\u6687\u7ba1\u7406': 'nav.leave',
  '\u30b7\u30d5\u30c8\u7ba1\u7406': 'nav.shift',
  '\u7d4c\u8cbb\u7ba1\u7406': 'nav.expenses',
  '\u798f\u5229\u539a\u751f': 'nav.benefits',
  '\u4f1a\u793e\u60c5\u5831': 'nav.company',
  '\u5951\u7d04\u7ba1\u7406': 'nav.contracts',
  '\u90e8\u7f72\u7ba1\u7406': 'nav.departments',
  '\u66f8\u985e\u7ba1\u7406': 'nav.documents',
  '\u5f93\u696d\u54e1\u7ba1\u7406': 'nav.employees',
  '\u8a55\u4fa1\u7ba1\u7406': 'nav.evaluation',
  '\u5916\u56fd\u4eba\u7ba1\u7406': 'nav.foreigners',
  '\u63a1\u7528\u7ba1\u7406': 'nav.recruitment',
  '\u7d66\u4e0e\u8a08\u7b97': 'nav.payroll',
  '\u7d66\u4e0e\u660e\u7d30': 'nav.payslip',
  '\u7d66\u4e0e\u30c6\u30fc\u30d6\u30eb': 'nav.salaryTable',
  '\u7d66\u4e0e\u30c6\u30fc\u30d6\u30eb\u7ba1\u7406': 'nav.salaryTable',
  '\u652f\u7d66\u65b9\u6cd5': 'nav.paymentMethods',
  '\u652f\u7d66\u65b9\u6cd5\u7ba1\u7406': 'nav.paymentMethods',
  '\u7814\u4fee\u7ba1\u7406': 'nav.training',
  '\u30ec\u30dd\u30fc\u30c8': 'nav.reports',
  '\u30ec\u30dd\u30fc\u30c8\u30fb\u5206\u6790': 'nav.reports',
  '\u6a29\u9650\u7ba1\u7406': 'nav.roles',
  '\u6a29\u9650\u30fb\u30a2\u30ab\u30a6\u30f3\u30c8\u7ba1\u7406': 'nav.roles',
  '\u901a\u77e5': 'nav.notifications',
  '\u901a\u77e5\u30fb\u30ea\u30de\u30a4\u30f3\u30c0\u30fc': 'nav.notifications',
  '\u901a\u77e5\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u7ba1\u7406': 'nav.notifications',
  '操作ログ': 'nav.auditLogs'
};

const subtitleMap: Record<string, string> = {
  '\u4eba\u4e8b\u7ba1\u7406\u30b7\u30b9\u30c6\u30e0\u306e\u6982\u8981': 'navSubtitle.dashboard',
  '\u5f93\u696d\u54e1\u306e\u51fa\u9005\u52e4\u30fb\u6b8b\u696d\u7ba1\u7406': 'navSubtitle.attendance',
  '\u4f11\u6687\u7533\u8acb\u306e\u7ba1\u7406\u3068\u627f\u8a8d': 'navSubtitle.leave',
  '\u30b7\u30d5\u30c8\u4f5c\u6210\u30fb\u7ba1\u7406\u30fb\u96c6\u8a08': 'navSubtitle.shift',
  '\u5f93\u696d\u54e1\u60c5\u5831\u306e\u7ba1\u7406': 'navSubtitle.employees',
  '\u65b0\u898f\u5f93\u696d\u54e1\u306e\u767b\u9332': 'navSubtitle.employeesNew',
  '\u5f93\u696d\u54e1\u60c5\u5831\u306e\u7de8\u96c6': 'navSubtitle.employeesEdit',
  '\u96c7\u7528\u5951\u7d04\u306e\u7ba1\u7406': 'navSubtitle.contracts',
  '\u5728\u7559\u30ab\u30fc\u30c9\u30fb\u30d3\u30b6\u7ba1\u7406': 'navSubtitle.residenceCards',
  '\u90e8\u7f72\u306e\u60c5\u5831\u306e\u7ba1\u7406': 'navSubtitle.departments',
  '\u90e8\u7f72\u306e\u60c5\u5831\u3068\u4eba\u54e1\u7ba1\u7406': 'navSubtitle.departments',
  '\u5f93\u696d\u54e1\u306e\u30ed\u30b0\u30a4\u30f3\u60c5\u5831\u3068\u30b7\u30b9\u30c6\u30e0\u6a29\u9650\u306e\u8a2d\u5b9a': 'navSubtitle.roles',
  '\u7d66\u4e0e\u306e\u81ea\u52d5\u8a08\u7b97\u3068\u660e\u7d30\u7ba1\u7406': 'navSubtitle.payroll',
  '\u793e\u4f1a\u4fdd\u967a\u30fb\u7a0e\u91d1\u30fb\u624b\u5f53\u306e\u8a2d\u5b9a': 'navSubtitle.salaryTable',
  '\u7d66\u4e0e\u306e\u652f\u7d66\u65b9\u6cd5\u30fb\u9280\u884c\u632f\u8fbc\u30fb\u73fe\u91d1\u652f\u7d66\u306e\u7ba1\u7406': 'navSubtitle.paymentMethods',
  '\u7d4c\u8cbb\u7533\u8acb\u30fb\u627f\u8a8d\u30fb\u96c6\u8a08': 'navSubtitle.expenses',
  '\u793e\u4f1a\u4fdd\u967a\u30fb\u624b\u5f53\u30fb\u798f\u5229\u539a\u751f\u306e\u7ba1\u7406': 'navSubtitle.benefits',
  '\u6c42\u4eba\u30fb\u5fdc\u52df\u8005\u30fb\u9078\u8003\u7ba1\u7406': 'navSubtitle.recruitment',
  '\u7814\u4fee\u30d7\u30ed\u30b0\u30e9\u30e0\u30fb\u53d7\u8b1b\u7ba1\u7406\u30fb\u4fee\u4e86\u8a3c': 'navSubtitle.training',
  '\u5404\u7a2e\u8a3c\u660e\u66f8\u30fb\u66f8\u985e\u306e\u767a\u884c\u7ba1\u7406': 'navSubtitle.documents',
  '\u4eba\u4e8b\u30c7\u30fc\u30bf\u306e\u5206\u6790\u30fb\u30ec\u30dd\u30fc\u30c8\u51fa\u529b': 'navSubtitle.reports',
  '\u30b7\u30b9\u30c6\u30e0\u901a\u77e5\u30fb\u30ea\u30de\u30a4\u30f3\u30c0\u30fc\u7ba1\u7406': 'navSubtitle.notifications',
  '\u81ea\u52d5\u901a\u77e5\u304a\u3088\u3073\u81ea\u52d5\u30ea\u30de\u30a4\u30f3\u30c0\u30fc\u306e\u6587\u7ae0\u7de8\u96c6': 'navSubtitle.templates',
  '\u30d7\u30ed\u30d5\u30a1\u30a5\u30eb\u7ba1\u7406\u30fb\u8a00\u8a9e\u8a2d\u5b9a': 'navSubtitle.profile',
  '\u5f93\u696d\u54e1\u306e\u4eba\u4e8b\u8a55\u4fa1\u30fb\u76ee\u6a19\u7ba1\u7406': 'navSubtitle.evaluation',
  'システム変更記録および管理者アクションを監視します。': 'navSubtitle.auditLogs'
};

function translateSubtitle(subtitle: string | undefined, t: any): string | undefined {
  if (!subtitle) return subtitle;

  // Dynamic names
  const suffixAttendance = '\u0020\u3055\u3093\u306e\u51fa\u9005\u52e4\u7ba1\u7406';
  const suffixLeave = '\u0020\u3055\u3093\u306e\u4f11\u6687\u7533\u8acb';
  const suffixPayroll = '\u0020\u3055\u3093\u306e\u7d66\u4e0e\u660e\u7d30\u66f8\u4e00\u89a7';

  if (subtitle.endsWith(suffixAttendance)) {
    const name = subtitle.replace(suffixAttendance, '');
    return t('navSubtitle.attendanceUser', { name }).replace('{name}', name);
  }
  if (subtitle.endsWith(suffixLeave)) {
    const name = subtitle.replace(suffixLeave, '');
    return t('navSubtitle.leaveUser', { name }).replace('{name}', name);
  }
  if (subtitle.endsWith(suffixPayroll)) {
    const name = subtitle.replace(suffixPayroll, '');
    return t('navSubtitle.payrollUser', { name }).replace('{name}', name);
  }

  const key = subtitleMap[subtitle];
  return key ? t(key) : subtitle;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const { t } = useI18n();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleCloseMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const translatedTitle = titleMap[title] ? t(titleMap[title]) : title;
  const translatedSubtitle = translateSubtitle(subtitle, t);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Sidebar overlay on mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={handleCloseMobile}
        />
      )}
      
      <Sidebar 
        className={`fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onCloseMobile={handleCloseMobile}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          title={translatedTitle} 
          subtitle={translatedSubtitle} 
          onMenuClick={() => setIsMobileOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

