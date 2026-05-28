'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentDate, cn } from '@/lib/utils';
import { getLoggedUser, logoutClient, LoggedUser } from '@/lib/auth-client';
import { useI18n } from '@/lib/i18n';

const headerModeTranslations: Record<string, {
  employeeView: string;
  managerView: string;
}> = {
  ja: {
    employeeView: '一般社員モード',
    managerView: '管理者モード',
  },
  en: {
    employeeView: 'Employee Mode',
    managerView: 'Admin Mode',
  },
  vi: {
    employeeView: 'Chế độ nhân viên',
    managerView: 'Chế độ quản trị',
  },
  zh: {
    employeeView: '员工模式',
    managerView: '管理模式',
  },
  th: {
    employeeView: 'โหมดพนักงาน',
    managerView: 'โหมดผู้ดูแล',
  },
};

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export default function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const { t, locale } = useI18n();
  const [today, setToday] = useState('');
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState('admin');

  useEffect(() => {
    setIsMounted(true);
    setToday(getCurrentDate());
    setUser(getLoggedUser());

    if (typeof window !== 'undefined') {
      const mode = document.cookie
        .split('; ')
        .find(row => row.startsWith('view_mode='))
        ?.split('=')[1] || 'admin';
      setViewMode(mode);
    }

    const handleLanguageOrProfileChange = () => {
      setUser(getLoggedUser());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('languageChange', handleLanguageOrProfileChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('languageChange', handleLanguageOrProfileChange);
      }
    };
  }, []);

  const handleToggleMode = () => {
    const nextMode = viewMode === 'employee' ? 'admin' : 'employee';
    document.cookie = `view_mode=${nextMode}; path=/; max-age=28800; SameSite=Lax`;
    setViewMode(nextMode);
    window.location.href = '/dashboard';
  };

  const handleLogout = async () => {
    if (confirm(t('common.logoutConfirm'))) {
      await logoutClient();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-1 rounded-xl text-slate-500 hover:bg-slate-50 border border-slate-100 md:hidden cursor-pointer"
              title={t('common.openMenu')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-lg md:text-2xl font-bold tracking-tight text-slate-800">{title}</h1>
            {subtitle && (
              <p className="text-[10px] md:text-xs font-semibold text-slate-400 mt-0.5 md:mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          {isMounted && today && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('common.todayDate')}</p>
              <p className="text-sm font-bold text-slate-700">{today}</p>
            </div>
          )}

          {isMounted && user && ['SUPER_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER'].includes(user.role) && (
            <button
              onClick={handleToggleMode}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow border shrink-0 flex items-center gap-1.5",
                viewMode === 'employee'
                  ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450 border-amber-250 dark:border-amber-900 hover:bg-amber-100/60"
                  : "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-450 border-indigo-250 dark:border-indigo-900 hover:bg-indigo-100/60"
              )}
              title={viewMode === 'employee' ? 'Chuyển sang chế độ quản trị' : 'Chuyển sang chế độ thường'}
            >
              <span>{viewMode === 'employee' ? '👤 ' + (headerModeTranslations[locale]?.employeeView || headerModeTranslations.en.employeeView) : '🔑 ' + (headerModeTranslations[locale]?.managerView || headerModeTranslations.en.managerView)}</span>
            </button>
          )}
          
          {isMounted && user ? (
            <div className="relative">
              {/* Clickable user profile info trigger */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2.5 md:gap-3 pl-3 md:pl-4 border-l border-slate-200 cursor-pointer outline-none hover:opacity-85 text-left active:scale-98 transition-all select-none"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0 ${user.avatar || 'bg-gradient-to-tr from-blue-500 to-indigo-600'}`}>
                  {(user.firstName?.charAt(0) || '').toUpperCase()}
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-slate-800 leading-tight">{user.lastName} {user.firstName}</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-blue-50 text-blue-700 border border-blue-100 mt-0.5 leading-none">
                    {user.role}
                  </span>
                </div>
                <svg className={cn("w-3 h-3 text-slate-400 transition-transform duration-200 hidden sm:block shrink-0", isDropdownOpen && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Backdrop to close dropdown */}
              {isDropdownOpen && (
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setIsDropdownOpen(false)}
                />
              )}

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl py-2 z-40 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('nav.myAccount')}</p>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate mt-0.5">{user.lastName} {user.firstName}</p>
                  </div>
                  
                  <Link
                    href="/profile?tab=basic"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <span className="text-sm">👤</span>
                    <span>{t('profile.tabBasic')}</span>
                  </Link>
                  
                  {user.nationality !== '\u65e5\u672c' && (
                    <Link
                      href="/profile?tab=visa"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="text-sm">🛂</span>
                      <span>{t('profile.tabVisa')}</span>
                    </Link>
                  )}
                  
                  <Link
                    href="/profile?tab=password"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <span className="text-sm">🔑</span>
                    <span>{t('profile.tabPassword')}</span>
                  </Link>
                  
                  <Link
                    href="/profile?tab=settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <span className="text-sm">⚙️</span>
                    <span>{t('profile.tabSettings')}</span>
                  </Link>

                  <div className="border-t border-slate-100 dark:border-slate-800/80 mt-1.5 pt-1">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-450 hover:bg-rose-50/70 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                    >
                      <span className="text-sm">🚪</span>
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            isMounted && (
              <div className="h-9 w-20 md:h-10 md:w-24 bg-slate-100 rounded-xl animate-pulse"></div>
            )
          )}
        </div>
      </div>
    </header>
  );
}

