'use client';

import { useState, useEffect } from 'react';
import { getCurrentDate } from '@/lib/utils';
import { getLoggedUser, logoutClient, LoggedUser } from '@/lib/auth-client';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [today, setToday] = useState('');
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setToday(getCurrentDate());
    setUser(getLoggedUser());
  }, []);

  const handleLogout = async () => {
    if (confirm('ログアウトしますか？')) {
      await logoutClient();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">{title}</h1>
          {subtitle && (
            <p className="text-xs font-semibold text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-6">
          {isMounted && today && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">今日の日付</p>
              <p className="text-sm font-bold text-slate-700">{today}</p>
            </div>
          )}
          
          {isMounted && user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-black text-slate-800">{user.lastName} {user.firstName}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 mt-0.5">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-all border border-slate-200/60 hover:border-rose-200/50 cursor-pointer active:scale-95"
                title="ログアウト"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            isMounted && (
              <div className="h-10 w-24 bg-slate-100 rounded-xl animate-pulse"></div>
            )
          )}
        </div>
      </div>
    </header>
  );
}
