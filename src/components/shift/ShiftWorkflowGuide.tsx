'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { getLoggedUser } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'shift_workflow_guide_collapsed';

type ActiveStep = 1 | 2 | 3 | 4;

interface ShiftWorkflowGuideProps {
  activeStep?: ActiveStep;
  compact?: boolean;
}

interface StepItem {
  step: number;
  title: string;
  desc: string;
  action?: string;
  href?: string | null;
}

function useIsEmployeeView(): boolean {
  const [isEmployee, setIsEmployee] = useState(false);

  useEffect(() => {
    const user = getLoggedUser();
    const viewMode =
      document.cookie
        .split('; ')
        .find(row => row.startsWith('view_mode='))
        ?.split('=')[1] || 'admin';
    setIsEmployee(user?.role === 'EMPLOYEE' || viewMode === 'employee');
  }, []);

  return isEmployee;
}

export default function ShiftWorkflowGuide({ activeStep, compact }: ShiftWorkflowGuideProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const isEmployee = useIsEmployeeView();
  const resolvedStep =
    activeStep ??
    (pathname.startsWith('/shift-register') ? 1 : pathname.startsWith('/shift') ? 2 : undefined);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const setDismissed = (value: boolean) => {
    setCollapsed(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  if (!mounted) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        className={cn(
          'text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl px-3 py-2 cursor-pointer transition-colors',
          compact && 'w-full text-left'
        )}
      >
        📋 {t('shiftWorkflow.showAgain')}
      </button>
    );
  }

  const adminSteps: StepItem[] = [
    {
      step: 1,
      title: t('shiftWorkflow.step1Title'),
      desc: t('shiftWorkflow.step1Desc'),
      action: t('shiftWorkflow.step1Action'),
      href: '/shift-register',
    },
    {
      step: 2,
      title: t('shiftWorkflow.step2Title'),
      desc: t('shiftWorkflow.step2Desc'),
      action: t('shiftWorkflow.step2Action'),
      href: '/shift',
    },
    {
      step: 3,
      title: t('shiftWorkflow.step3Title'),
      desc: t('shiftWorkflow.step3Desc'),
      action: t('shiftWorkflow.step3Action'),
      href: '/shift',
    },
    {
      step: 4,
      title: t('shiftWorkflow.step4Title'),
      desc: t('shiftWorkflow.step4Desc'),
      href: null,
    },
  ];

  const employeeSteps: StepItem[] = [
    {
      step: 1,
      title: t('shiftWorkflow.employeeStep1Title'),
      desc: t('shiftWorkflow.employeeStep1Desc'),
      href: '/shift-register',
    },
    {
      step: 2,
      title: t('shiftWorkflow.employeeStep2Title'),
      desc: t('shiftWorkflow.employeeStep2Desc'),
      href: '/work-calendar',
    },
  ];

  const steps = isEmployee ? employeeSteps : adminSteps;
  const title = isEmployee ? t('shiftWorkflow.employeeTitle') : t('shiftWorkflow.title');

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden',
        compact ? 'p-3' : 'p-4 md:p-5'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-[11px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          {t('shiftWorkflow.dismiss')}
        </button>
      </div>

      <ol className="flex flex-col md:flex-row md:items-stretch gap-3 md:gap-2">
        {steps.map((item, idx) => {
          const isActive = resolvedStep === item.step;
          const isLast = idx === steps.length - 1;

          return (
            <li key={item.step} className="flex md:flex-1 md:min-w-0 items-stretch gap-2">
              <div
                className={cn(
                  'flex-1 rounded-xl border p-3 transition-all',
                  isActive
                    ? 'border-blue-400 bg-blue-50/80 dark:bg-blue-950/30 ring-2 ring-blue-400/40'
                    : 'border-slate-200/80 bg-slate-50/50 dark:bg-slate-800/40'
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black',
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    )}
                  >
                    {item.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                    {item.href && item.action && (
                      <Link
                        href={item.href}
                        className="inline-block mt-2 text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        {item.action} →
                      </Link>
                    )}
                    {item.href && !item.action && (
                      <Link
                        href={item.href}
                        className="inline-block mt-2 text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              {!isLast && (
                <span className="hidden md:flex items-center text-slate-300 font-bold px-0.5">›</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}