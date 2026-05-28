'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

const modeTranslations: Record<string, {
  title: string;
  desc: string;
  adminBtn: string;
  employeeBtn: string;
}> = {
  ja: {
    title: 'ログインモードの選択',
    desc: 'ご利用の権限に合わせて、システムにログインするモードを選択してください。',
    adminBtn: '管理者モード (管理業務・承認など)',
    employeeBtn: '一般モード (自身の給料・休暇申請など)',
  },
  en: {
    title: 'Select Login Mode',
    desc: 'Please select a mode to log in based on your permissions.',
    adminBtn: 'Admin Mode (Management & Approval)',
    employeeBtn: 'Regular Mode (Own Salary & Leave)',
  },
  vi: {
    title: 'Chọn chế độ đăng nhập',
    desc: 'Vui lòng chọn chế độ đăng nhập phù hợp với quyền hạn của bạn.',
    adminBtn: 'Chế độ quản trị (Quản lý & Xét duyệt)',
    employeeBtn: 'Chế độ thường (Xem lương & Nộp đơn xin nghỉ)',
  },
  zh: {
    title: '选择登录模式',
    desc: '请根据您的权限选择要登录的模式。',
    adminBtn: '管理模式 (管理和审批)',
    employeeBtn: '普通模式 (个人薪资和请假)',
  },
  th: {
    title: 'เลือกโหมดการเข้าสู่ระบบ',
    desc: 'โปรดเลือกโหมดในการเข้าสู่ระบบตามสิทธิ์ของคุณ',
    adminBtn: 'โหมดผู้ดูแลระบบ (การจัดการและการอนุมัติ)',
    employeeBtn: 'โหมดปกติ (เงินเดือนและการลาของตนเอง)',
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const router = useRouter();
  const { t, locale } = useI18n();

  useEffect(() => {
    // Clear session user and view_mode cookies on load to ensure a clean state
    document.cookie = 'session_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'view_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.message || t('auth.loginFailed'));
      }

      const user = body.data;
      if (['SUPER_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER'].includes(user.role)) {
        setTempUser(user);
        setShowModeSelection(true);
      } else {
        document.cookie = 'view_mode=employee; path=/; max-age=28800; SameSite=Lax';
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handleModeSelect = (mode: 'admin' | 'employee') => {
    document.cookie = `view_mode=${mode}; path=/; max-age=28800; SameSite=Lax`;
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo Icon */}
        <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black font-mono shadow-lg mx-auto border border-blue-500/25">
          HR
        </div>
        <h2 className="mt-5 text-3xl font-extrabold text-slate-800 tracking-tight">
          HR Management
        </h2>
        <p className="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          {t('auth.systemName')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200/80 shadow-2xl rounded-3xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-bold animate-fadeIn">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-550 mb-1">
                {t('auth.email')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="taro.yamada@company.jp"
                className="w-full px-4 py-3 border border-slate-250 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-550 mb-1">
                {t('auth.password')}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-slate-250 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer transition-all active:scale-98"
              >
                {loading ? t('auth.loggingIn') : t('auth.login')}
              </button>
            </div>
          </form>

          {/* Credentials Helper Panel */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-1.5 leading-relaxed text-slate-500">
              <div className="font-bold text-slate-700 mb-1">💡 {t('auth.demoHint')}</div>
              <p>• <b>山田 太郎</b>: taro.yamada@company.jp / NV00119920315</p>
              <p>• <b>佐藤 花子</b>: hanako.sato@company.jp / NV00219900620</p>
              <p>• <b>高橋 健太</b>: kenta.takahashi@company.jp / NV00319881105 ({t('auth.hrManager')})</p>
              <p>• <b>小林 由美</b>: yumi.kobayashi@company.jp / NV00819850612 ({t('auth.systemAdmin')})</p>
              <p className="text-[10px] text-slate-400 mt-2">
                {t('auth.initialPasswordRule')}: <code>{t('auth.employeeCodeBirthdate')}</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {showModeSelection && tempUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-150/80 dark:border-slate-800 text-center animate-scaleUp">
            {/* Header Icon */}
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg mx-auto mb-4 border border-blue-500/20 animate-bounce">
              👤
            </div>
            
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              {modeTranslations[locale]?.title || modeTranslations.en.title}
            </h3>
            
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium px-2">
              {modeTranslations[locale]?.desc || modeTranslations.en.desc}
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleModeSelect('admin')}
                className="w-full flex items-center justify-between px-5 py-4 border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-350 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-2xl text-sm font-extrabold transition-all cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔑</span>
                  <span className="text-left font-black">{modeTranslations[locale]?.adminBtn || modeTranslations.en.adminBtn}</span>
                </div>
                <span>➔</span>
              </button>

              <button
                onClick={() => handleModeSelect('employee')}
                className="w-full flex items-center justify-between px-5 py-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-2xl text-sm font-extrabold transition-all cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">👤</span>
                  <span className="text-left font-black">{modeTranslations[locale]?.employeeBtn || modeTranslations.en.employeeBtn}</span>
                </div>
                <span>➔</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
