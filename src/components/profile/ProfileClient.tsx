'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';
import { getVisaStatusLabel } from '@/lib/translations/options';

interface ProfileUser {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  lastNameKana: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  nationality: string;
  residenceStatus: string;
  residenceCardNumber: string;
  residenceExpiry: string;
  language: string;
  department: string;
  position: string;
  hireDate: string;
}

const visaStatuses = [
  '技術・人文知識・国際業務',
  '特定技能',
  '家族滞在',
  '留学',
  '永住者',
  '定住者',
  '日本人の配偶者等',
  '特定活動',
];

const presetAvatars = [
  'bg-gradient-to-tr from-blue-500 to-indigo-600',
  'bg-gradient-to-tr from-emerald-400 to-teal-600',
  'bg-gradient-to-tr from-rose-400 to-orange-500',
  'bg-gradient-to-tr from-purple-500 to-pink-600',
  'bg-gradient-to-tr from-amber-400 to-orange-600',
  'bg-gradient-to-tr from-sky-400 to-blue-600',
];

export default function ProfileClient({ user, initialTab = 'basic' }: { user: ProfileUser; initialTab?: 'basic' | 'visa' | 'password' | 'settings' }) {
  const { t, locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = useState<'basic' | 'visa' | 'password' | 'settings'>(initialTab);
  
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  const [phone, setPhone] = useState(user.phone);
  const [address, setAddress] = useState(user.address);
  const [avatar, setAvatar] = useState(user.avatar || presetAvatars[0]);
  
  const [residenceStatus, setResidenceStatus] = useState(user.residenceStatus);
  const [residenceCardNumber, setResidenceCardNumber] = useState(user.residenceCardNumber);
  const [residenceExpiry, setResidenceExpiry] = useState(user.residenceExpiry);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [language, setLanguageState] = useState(user.language);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          address,
          avatar,
          language,
          residenceStatus,
          residenceCardNumber,
          residenceExpiry,
        }),
      });

      const body = await res.json();
      if (res.ok) {
        showMsg(t('profile.saveSuccess'), 'success');
        // Update client-side language provider
        if (language !== locale) {
          setLocale(language);
        } else {
          // Dispatch custom event to let other components (like Header) sync user cookies
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('languageChange'));
          }
        }
      } else {
        showMsg(body.error || t('profile.saveError'), 'error');
      }
    } catch (e) {
      console.error(e);
      showMsg(t('profile.saveError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMsg(t('profile.fillAllFields'), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMsg(t('profile.passwordsNotMatch'), 'error');
      return;
    }
    if (newPassword.length < 6) {
      showMsg(t('profile.passwordTooShort'), 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const body = await res.json();
      if (res.ok) {
        showMsg(t('profile.changeSuccess'), 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showMsg(body.error || t('profile.changePasswordError'), 'error');
      }
    } catch (e) {
      console.error(e);
      showMsg(t('profile.networkError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Banner / Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center gap-5">
        <div className="relative">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-md ${avatar.startsWith('bg-') ? avatar : 'bg-slate-300'}`}>
            {user.firstNameKana?.charAt(0).toUpperCase() || user.firstName?.charAt(0).toUpperCase()}
          </div>
        </div>
        
        <div className="text-center sm:text-left space-y-1">
          <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-750 dark:text-blue-300 text-[10px] font-bold rounded-xl border border-blue-100 dark:border-blue-900/50 uppercase tracking-wider font-mono">
            {user.employeeCode}
          </span>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {user.lastName} {user.firstName}
          </h2>
          <p className="text-xs font-semibold text-slate-450 dark:text-slate-400">
            {user.department} <span className="text-slate-300 dark:text-slate-750">|</span> {user.position}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-850 rounded-2xl p-1 border border-slate-200 dark:border-slate-800 shadow-inner max-w-full overflow-x-auto">
        {[
          { key: 'basic', label: t('profile.tabBasic'), icon: '👤' },
          ...(user.nationality !== '日本' ? [{ key: 'visa', label: t('profile.tabVisa'), icon: 'Passport' }] : []),
          { key: 'password', label: t('profile.tabPassword'), icon: '🔑' },
          { key: 'settings', label: t('profile.tabSettings'), icon: '⚙️' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-800 shadow text-blue-650 dark:text-blue-400 font-black'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Status Messages */}
      {message && (
        <div className={`p-4 rounded-2xl text-xs font-bold border animate-fadeIn flex items-center justify-between ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-250 dark:border-emerald-900/50'
            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-250 dark:border-rose-900/50'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-sm cursor-pointer opacity-70 hover:opacity-100">&times;</button>
        </div>
      )}

      {/* Contents */}
      {activeTab === 'basic' && (
        <Card title={t('profile.basicTitle')}>
          <div className="space-y-5">
            {/* Avatar Preset Grid */}
            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 block mb-2">{t('profile.avatar')}</label>
              <div className="grid grid-cols-6 gap-3.5 max-w-sm">
                {presetAvatars.map((bg, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAvatar(bg)}
                    className={`aspect-square rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all border-2 cursor-pointer flex items-center justify-center ${bg} ${
                      avatar === bg 
                        ? 'border-blue-500 ring-2 ring-blue-500/20' 
                        : 'border-transparent'
                    }`}
                  >
                    {avatar === bg && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">{t('profile.phone')}</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold rounded-xl outline-none"
                  placeholder="080-1234-5678"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">{t('profile.email')}</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-semibold text-slate-400 rounded-xl outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">{t('profile.address')}</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold rounded-xl outline-none"
                placeholder={t('profile.addressPlaceholder')}
              />
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'visa' && user.nationality !== '日本' && (
        <Card title={t('profile.visaTitle')}>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">{t('profile.nationality')}</label>
                <input
                  type="text"
                  value={user.nationality}
                  disabled
                  className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-semibold text-slate-400 rounded-xl outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">{t('profile.visaType')}</label>
                <select
                  value={residenceStatus}
                  onChange={e => setResidenceStatus(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold rounded-xl outline-none cursor-pointer"
                >
                  <option value="">{t('common.select')}</option>
                  {visaStatuses.map(status => (
                    <option key={status} value={status}>{getVisaStatusLabel(status, locale)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">{t('profile.cardNumber')}</label>
                <input
                  type="text"
                  value={residenceCardNumber}
                  onChange={e => setResidenceCardNumber(e.target.value.toUpperCase())}
                  maxLength={12}
                  className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-mono font-semibold rounded-xl outline-none"
                  placeholder="AB12345678CD"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">{t('profile.cardExpiry')}</label>
                <input
                  type="date"
                  value={residenceExpiry}
                  onChange={e => setResidenceExpiry(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold rounded-xl outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'password' && (
        <Card title={t('profile.passwordTitle')}>
          <div className="space-y-5">
            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">{t('profile.curPassword')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold rounded-xl outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">{t('profile.newPassword')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">{t('profile.confPassword')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-end">
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? t('common.loading') : t('profile.changePasswordBtn')}
              </button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card title={t('profile.settingsTitle')}>
          <div className="space-y-5">
            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 block mb-2">{t('profile.selectLanguage')}</label>
              <select
                value={language}
                onChange={e => setLanguageState(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 rounded-xl outline-none cursor-pointer min-w-[200px]"
              >
                <option value="ja">日本語 (Japanese)</option>
                <option value="en">English</option>
                <option value="vi">Tiếng Việt (Vietnamese)</option>
                <option value="zh">中文 (Chinese)</option>
                <option value="th">ไทย (Thai)</option>
              </select>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
