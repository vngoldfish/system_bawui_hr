'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getLoggedUser, hasClientPermission, LoggedUser } from '@/lib/auth-client';
import { useI18n } from '@/lib/i18n';

interface MenuItem {
  href: string;
  label: string;
  icon: string;
}

interface MenuSection {
  label: string;
  icon: string;
  items: MenuItem[];
}

interface SidebarProps {
  className?: string;
  onCloseMobile?: () => void;
}

const menuSections: MenuSection[] = [
  {
    label: 'nav.main',
    icon: '🏠',
    items: [
      { href: '/dashboard', label: 'nav.dashboard', icon: '📊' },
      { href: '/notifications', label: 'nav.notifications', icon: '🔔' },
      { href: '/profile', label: 'nav.myAccount', icon: '👤' },
    ],
  },
  {
    label: 'nav.hr',
    icon: '👥',
    items: [
      { href: '/employees', label: 'nav.employees', icon: '👤' },
      { href: '/departments', label: 'nav.departments', icon: '🏬' },
      { href: '/shitens', label: 'nav.shitens', icon: '🏪' },
      { href: '/contracts', label: 'nav.contracts', icon: '📋' },
      { href: '/residence-cards', label: 'nav.foreigners', icon: '🛂' },
      { href: '/evaluation', label: 'nav.evaluation', icon: '📈' },
      { href: '/recruitment', label: 'nav.recruitment', icon: '📝' },
    ],
  },
  {
    label: 'nav.attendanceLeave',
    icon: '🕐',
    items: [
      { href: '/attendance', label: 'nav.attendance', icon: '⏰' },
      { href: '/leave', label: 'nav.leave', icon: '🏖️' },
      { href: '/shift', label: 'nav.shift', icon: '📅' },
    ],
  },
  {
    label: 'nav.payrollExpenses',
    icon: '💰',
    items: [
      { href: '/payroll', label: 'nav.payroll', icon: '💵' },
      { href: '/salary-table', label: 'nav.salaryTable', icon: '📑' },
      { href: '/payment-methods', label: 'nav.paymentMethods', icon: '💳' },
      { href: '/expenses', label: 'nav.expenses', icon: '🧾' },
      { href: '/benefits', label: 'nav.benefits', icon: '🎁' },
    ],
  },
  {
    label: 'nav.trainingDocs',
    icon: '📚',
    items: [
      { href: '/training', label: 'nav.training', icon: '🎓' },
      { href: '/documents', label: 'nav.documents', icon: '📄' },
    ],
  },
  {
    label: 'nav.reportsSettings',
    icon: '⚙️',
    items: [
      { href: '/reports', label: 'nav.reports', icon: '📈' },
      { href: '/roles', label: 'nav.roles', icon: '🔑' },
      { href: '/company', label: 'nav.company', icon: '🏢' },
      { href: '/audit-logs', label: 'nav.auditLogs', icon: '📜' },
    ],
  },
];

const permissionMap: Record<string, string> = {
  '/employees': 'employees:view',
  '/departments': 'employees:view',
  '/shitens': 'employees:view',
  '/contracts': 'employees:view',
  '/residence-cards': 'residence_card:view',
  '/recruitment': 'employees:view',
  '/attendance': 'attendance:view',
  '/leave': 'leave:view',
  '/shift': 'attendance:view',
  '/payroll': 'payroll:view',
  '/salary-table': 'payroll:view',
  '/payment-methods': 'payroll:view',
  '/benefits': 'payroll:view',
  '/reports': 'reports:view',
  '/roles': 'settings:view',
  '/company': 'settings:view',
  '/audit-logs': 'audit_logs:view',
};

export default function Sidebar({ className, onCloseMobile }: SidebarProps) {
  const { t } = useI18n();
  const pathname = usePathname();

  // Auto-close sidebar on mobile when pathname changes
  useEffect(() => {
    onCloseMobile?.();
  }, [pathname, onCloseMobile]);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [filteredSections, setFilteredSections] = useState<MenuSection[]>([]);
  const [companyName, setCompanyName] = useState('');

  // Load collapse state and user permissions on mount
  useEffect(() => {
    setIsMounted(true);
    setCompanyName(t('common.companyName'));
    if (typeof window !== 'undefined') {
      const savedCollapsed = localStorage.getItem('sidebar_collapsed');
      if (savedCollapsed) {
        setIsCollapsed(savedCollapsed === 'true');
      }
      const savedInfo = localStorage.getItem('company_info');
      if (savedInfo) {
        try {
          const parsed = JSON.parse(savedInfo);
          if (parsed.name) {
            setCompanyName(parsed.name);
          }
        } catch (e) {
          console.error('Failed to parse company_info', e);
        }
      }
    }
    
    const loggedUser = getLoggedUser();
    setUser(loggedUser);

    const viewMode = (typeof window !== 'undefined' && document.cookie
      .split('; ')
      .find(row => row.startsWith('view_mode='))
      ?.split('=')[1]) || 'admin';

    const effectiveRole = loggedUser?.role === 'EMPLOYEE' || viewMode === 'employee' ? 'EMPLOYEE' : loggedUser?.role;

    const filtered = menuSections.map(section => {
      const items = section.items.filter(item => {
        if (item.href === '/notifications' && effectiveRole === 'EMPLOYEE') {
          return false;
        }
        if (item.href === '/payroll' && effectiveRole === 'EMPLOYEE') {
          return true;
        }

        if (effectiveRole === 'EMPLOYEE') {
          return ['/dashboard', '/profile', '/attendance', '/leave', '/payroll'].includes(item.href);
        }

        const requiredPermission = permissionMap[item.href] || (item.href === '/evaluation' ? 'employees:view' : null);
        if (!requiredPermission) return true;
        return hasClientPermission(requiredPermission, loggedUser);
      }).map(item => {
        // Change label to "給与明細" (Payslip) for regular employees
        if (item.href === '/payroll' && effectiveRole === 'EMPLOYEE') {
          return { ...item, label: 'nav.payslip' };
        }
        return item;
      });
      return { ...section, items };
    }).filter(section => section.items.length > 0);

    setFilteredSections(filtered);

    setOpenSections(
      filtered
        .filter(s => s.items.some(i => pathname.startsWith(i.href)))
        .map(s => s.label)
    );
  }, [pathname]);

  const toggleCollapse = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_collapsed', String(newVal));
    }
  };

  const toggleSection = (label: string) => {
    setOpenSections(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  // Prevent hydration flash by keeping empty layout structure or simple state
  const sideWidthClass = isMounted && isCollapsed ? "w-16" : "w-64";

  return (
    <aside className={cn(
      "relative bg-slate-800 text-white flex-shrink-0 flex flex-col overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out",
      sideWidthClass,
      className
    )}>
      <div className={cn("p-4 flex-shrink-0", isCollapsed ? "px-2" : "px-4")}>
        <div className="mb-6 flex flex-col items-center relative">
          {/* Close button for mobile views */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="absolute right-0 top-0 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-650 text-slate-350 hover:text-white md:hidden cursor-pointer"
              title={t('common.close')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {isMounted && isCollapsed ? (
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-[11px] font-black font-sans shadow-md border border-blue-500 animate-fadeIn" title={companyName}>
              {companyName ? companyName.replace(/\u682a\u5f0f\u4f1a\u793a|\u6709\u9650\u4f1a\u793a/g, '').slice(0, 2) : 'HR'}
            </div>
          ) : (
            <div className="animate-fadeIn w-full text-center px-1">
              <h1 className="text-sm font-black tracking-tight whitespace-nowrap overflow-hidden text-ellipsis pr-6" title={companyName}>
                {companyName}
              </h1>
              <p className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">{t('common.hrSystem')}</p>
            </div>
          )}
        </div>

        <nav className="space-y-1.5">
          {!isMounted ? (
            <div className="space-y-3 animate-pulse px-2 py-4">
              <div className="h-4 bg-slate-700 rounded-md w-3/4"></div>
              <div className="h-8 bg-slate-700 rounded-xl w-full"></div>
              <div className="h-8 bg-slate-700 rounded-xl w-full"></div>
              <div className="h-4 bg-slate-700 rounded-md w-1/2 mt-6"></div>
              <div className="h-8 bg-slate-700 rounded-xl w-full"></div>
              <div className="h-8 bg-slate-700 rounded-xl w-full"></div>
            </div>
          ) : (
            filteredSections.map((section) => {
              const isOpen = openSections.includes(section.label);
              const hasActive = section.items.some(i => pathname.startsWith(i.href));
              
              return (
                <div key={section.label} className="relative group">
                  <button
                    onClick={() => !(isMounted && isCollapsed) && toggleSection(section.label)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-bold outline-none cursor-pointer",
                      hasActive 
                        ? "bg-slate-700 text-white border-l-4 border-blue-500 pl-2" 
                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                    )}
                    title={isMounted && isCollapsed ? t(section.label) : undefined}
                  >
                    <span className="text-base flex-shrink-0">{section.icon}</span>
                    {!(isMounted && isCollapsed) && (
                      <>
                        <span className="flex-1 text-left whitespace-nowrap animate-fadeIn">{t(section.label)}</span>
                        <svg
                          className={cn("w-4 h-4 transition-transform duration-200 shrink-0", isOpen && "rotate-180")}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>

                  {/* Collapsed Hover Tooltip Dropdown */}
                  {isMounted && isCollapsed && (
                    <div className="absolute left-14 top-0 hidden group-hover:block z-50 bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl p-3.5 min-w-[180px] animate-fadeIn transition-all">
                      <div className="font-black text-xs border-b border-slate-800 pb-2 mb-2 text-slate-400">
                        {t(section.label)}
                      </div>
                      <div className="space-y-1">
                        {section.items.map((item) => {
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                isActive 
                                  ? "bg-blue-600 text-white" 
                                  : "text-slate-350 hover:bg-slate-800 hover:text-white"
                              )}
                            >
                              <span className="text-sm shrink-0">{item.icon}</span>
                              <span className="whitespace-nowrap">{t(item.label)}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expanded submenu */}
                  {isOpen && !(isMounted && isCollapsed) && (
                    <div className="ml-3 mt-1.5 space-y-1 border-l-2 border-slate-700 pl-3.5 animate-fadeIn">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-xs font-bold",
                              isActive
                                ? "bg-blue-600 text-white shadow-sm font-black"
                                : "text-slate-350 hover:bg-slate-750 hover:text-white"
                            )}
                          >
                            <span className="text-sm shrink-0">{item.icon}</span>
                            <span className="whitespace-nowrap">{t(item.label)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
      </div>

      {/* Collapse Arrow Button & Copyright */}
      <div className="mt-auto p-4 border-t border-slate-700 flex flex-col items-center gap-3">
        <button
          onClick={toggleCollapse}
          className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-650 text-white flex items-center justify-center transition-all shadow border border-slate-600 hover:border-slate-500 cursor-pointer active:scale-95 shrink-0"
          title={isCollapsed ? t('common.expandMenu') : t('common.collapseMenu')}
        >
          <span className="text-xs font-bold leading-none">
            {isMounted && isCollapsed ? '▶' : '◀'}
          </span>
        </button>
        {!(isMounted && isCollapsed) ? (
          <div className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-wider animate-fadeIn">
            © 2026 HR System
            <span className="block mt-0.5 text-slate-500 font-medium">Developed by Team Bawui Dev</span>
          </div>
        ) : (
          <div className="text-[8px] text-slate-500 text-center font-bold font-mono tracking-tighter" title="Developed by Team Bawui Dev">
            BAWUI
          </div>
        )}
      </div>
    </aside>
  );
}
