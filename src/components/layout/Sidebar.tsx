'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getLoggedUser, hasClientPermission, LoggedUser } from '@/lib/auth-client';

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
}

const menuSections: MenuSection[] = [
  {
    label: 'メイン',
    icon: '🏠',
    items: [
      { href: '/dashboard', label: 'ダッシュボード', icon: '📊' },
      { href: '/notifications', label: '通知', icon: '🔔' },
    ],
  },
  {
    label: '人事',
    icon: '👥',
    items: [
      { href: '/employees', label: '従業員管理', icon: '👤' },
      { href: '/departments', label: '部署管理', icon: '🏬' },
      { href: '/contracts', label: '契約管理', icon: '📋' },
      { href: '/residence-cards', label: '外国人管理', icon: '🛂' },
      { href: '/evaluation', label: '評価管理', icon: '📈' },
      { href: '/recruitment', label: '採用管理', icon: '📝' },
    ],
  },
  {
    label: '勤怠・休暇',
    icon: '🕐',
    items: [
      { href: '/attendance', label: '勤怠管理', icon: '⏰' },
      { href: '/leave', label: '休暇管理', icon: '🏖️' },
      { href: '/shift', label: 'シフト管理', icon: '📅' },
    ],
  },
  {
    label: '給与・経費',
    icon: '💰',
    items: [
      { href: '/payroll', label: '給与計算', icon: '💵' },
      { href: '/salary-table', label: '給与テーブル', icon: '📑' },
      { href: '/payment-methods', label: '支給方法', icon: '💳' },
      { href: '/expenses', label: '経費管理', icon: '🧾' },
      { href: '/benefits', label: '福利厚生', icon: '🎁' },
    ],
  },
  {
    label: '教育・書類',
    icon: '📚',
    items: [
      { href: '/training', label: '研修管理', icon: '🎓' },
      { href: '/documents', label: '書類管理', icon: '📄' },
    ],
  },
  {
    label: '分析・設定',
    icon: '⚙️',
    items: [
      { href: '/reports', label: 'レポート', icon: '📈' },
      { href: '/roles', label: '権限管理', icon: '🔑' },
      { href: '/company', label: '会社情報', icon: '🏢' },
    ],
  },
];

const permissionMap: Record<string, string> = {
  '/employees': 'employees:view',
  '/departments': 'employees:view',
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
};

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [filteredSections, setFilteredSections] = useState<MenuSection[]>([]);
  const [companyName, setCompanyName] = useState('株式会社ロング');

  // Load collapse state and user permissions on mount
  useEffect(() => {
    setIsMounted(true);
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

    const filtered = menuSections.map(section => {
      const items = section.items.filter(item => {
        if (item.href === '/notifications' && loggedUser?.role === 'EMPLOYEE') {
          return false;
        }
        if (item.href === '/payroll' && loggedUser?.role === 'EMPLOYEE') {
          return true;
        }
        const requiredPermission = permissionMap[item.href] || (item.href === '/evaluation' ? 'employees:view' : null);
        if (!requiredPermission) return true;
        return hasClientPermission(requiredPermission, loggedUser);
      }).map(item => {
        // Change label to "給与明細" (Payslip) for regular employees
        if (item.href === '/payroll' && loggedUser?.role === 'EMPLOYEE') {
          return { ...item, label: '給与明細' };
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
        <div className="mb-6 flex flex-col items-center">
          {isMounted && isCollapsed ? (
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-[11px] font-black font-sans shadow-md border border-blue-500 animate-fadeIn" title={companyName}>
              {companyName ? companyName.replace(/株式会社|有限会社/g, '').slice(0, 2) : 'HR'}
            </div>
          ) : (
            <div className="animate-fadeIn w-full text-center px-1">
              <h1 className="text-sm font-black tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" title={companyName}>
                {companyName}
              </h1>
              <p className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">人事管理システム</p>
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
                    title={isMounted && isCollapsed ? section.label : undefined}
                  >
                    <span className="text-base flex-shrink-0">{section.icon}</span>
                    {!(isMounted && isCollapsed) && (
                      <>
                        <span className="flex-1 text-left whitespace-nowrap animate-fadeIn">{section.label}</span>
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
                        {section.label}
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
                              <span className="whitespace-nowrap">{item.label}</span>
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
                            <span className="whitespace-nowrap">{item.label}</span>
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
          title={isCollapsed ? 'メニューを展開' : 'メニューを折りたたむ'}
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
