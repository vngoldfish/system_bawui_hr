'use client';

import { useState, useMemo, useEffect } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';

interface CompanyInfo {
  name: string;
  nameKana: string;
  representative: string;
  representativeTitle: string;
  established: string;
  capital: string;
  employees: string;
  industry: string;
  registrationNumber: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  salaryCutoffDay: string;
  payday: string;
  roundingPolicy: string; // 'exact' | '15min' | '30min'
  healthInsuranceRate: string;
}

const defaultCompany: CompanyInfo = {
  name: '\u682a\u5f0f\u4f1a\u793a\u30ed\u30f3\u30b0',
  nameKana: '\u30ab\u30d6\u30b7\u30ad\u30ac\u30a4\u30b7\u30e3\u30ed\u30f3\u30b0',
  representative: '\u30ed\u30f3\u0020\u30b0\u30a8\u30f3',
  representativeTitle: '\u4ee3\u8868\u53d6\u7de5\u5f79',
  established: '2015-04-01',
  capital: '10,000,000\u5186',
  employees: '14\u540d',
  industry: '\u0049\u0054\u30fb\u30bd\u30d5\u30c8\u30a6\u30a7\u30a2',
  registrationNumber: 'T1234567890123',
  address: '\u3012100-0001\u0020\u6771\u4eac\u90fd\u5343\u4ee3\u7530\u533a\u5343\u4ee3\u75301-1-1\u0020\u30ed\u30f3\u30b0\u30d3\u30eb3F',
  phone: '03-1234-5678',
  fax: '03-1234-5679',
  email: 'info@long-corp.jp',
  website: 'https://www.long-corp.jp',
  bankName: '\u4e09\u83f1\u0055\u0046\u004a\u9280\u884c',
  branchName: '\u6771\u4eac\u652f\u5e97',
  accountType: '\u666e\u901a',
  accountNumber: '1234567',
  accountHolder: '\u30ab\u30d6\u30b7\u30ad\u30ac\u30a4\u30b7\u30e3\u30ed\u30f3\u30b0',
  salaryCutoffDay: '末日',
  payday: '25',
  roundingPolicy: 'exact',
  healthInsuranceRate: '9.98',
};

const getAccountTypeLabel = (type: string, t: any) => {
  const isVi = t('company.cancelBtn').includes('Hủy');
  const isEn = t('company.cancelBtn').includes('Cancel');
  const isZh = t('company.cancelBtn').includes('\u53d6\u6d88');
  const isTh = t('company.cancelBtn').includes('ยกเลิก');
  if (type === '\u666e\u901a') return isVi ? 'Thông thường (Savings)' : isEn ? 'Savings' : isZh ? '\u666e\u901a\u5b58\u6b3e' : isTh ? 'ออมทรัพย์' : '\u666e\u901a';
  if (type === '\u5f53\u5ea7') return isVi ? 'Vãng lai (Current)' : isEn ? 'Current' : isZh ? '\u652f\u7968\u5b58\u6b3e' : isTh ? 'กระแสรายวัน' : '\u5f53\u5ea7';
  return type;
};

const getIndustryLabel = (ind: string, t: any) => {
  const isVi = t('company.cancelBtn').includes('Hủy');
  const isEn = t('company.cancelBtn').includes('Cancel');
  const isZh = t('company.cancelBtn').includes('\u53d6\u6d88');
  const isTh = t('company.cancelBtn').includes('ยกเลิก');
  if (ind === '\u0049\u0054\u30fb\u30bd\u30d5\u30c8\u30a6\u30a7\u30a2') return isVi ? 'CNTT & Phần mềm' : isEn ? 'IT & Software' : isZh ? '\u0049\u0054\u4e0e\u8f6f\u4ef6' : isTh ? 'ไอทีและซอฟต์แวร์' : '\u0049\u0054\u30fb\u30bd\u30d5\u30c8\u30a6\u30a7\u30a2';
  return ind;
};

const getRepTitleLabel = (title: string, t: any) => {
  const isVi = t('company.cancelBtn').includes('Hủy');
  const isEn = t('company.cancelBtn').includes('Cancel');
  const isZh = t('company.cancelBtn').includes('\u53d6\u6d88');
  const isTh = t('company.cancelBtn').includes('ยกเลิก');
  if (title === '\u4ee3\u8868\u53d6\u7de5\u5f79') return isVi ? 'Giám đốc đại diện' : isEn ? 'Representative Director' : isZh ? '\u4ee3\u8868\u8463\u4e8b' : isTh ? 'กรรมการผู้จัดการ' : '\u4ee3\u8868\u53d6\u7de5\u5f79';
  return title;
};

export default function CompanyClient({ initialData }: { initialData?: Partial<CompanyInfo> }) {
  const { t, locale } = useI18n();
  const [company, setCompany] = useState<CompanyInfo>(defaultCompany);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CompanyInfo>(defaultCompany);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch company info from database API on mount
  useEffect(() => {
    const loadCompany = async () => {
      try {
        const res = await fetch('/api/company');
        if (res.ok) {
          const data = await res.json();
          const loaded = {
            ...defaultCompany,
            ...data,
            healthInsuranceRate: data.healthInsuranceRate != null ? String(data.healthInsuranceRate) : '9.98',
            ...initialData,
          };
          setCompany(loaded);
          setDraft(loaded);
        }
      } catch (e) {
        console.error('Failed to load company info:', e);
      }
    };
    loadCompany();
  }, [initialData]);

  const handleEdit = () => {
    setDraft(company);
    setEditing(true);
    setSaved(false);
    setError(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...draft,
        healthInsuranceRate: draft.healthInsuranceRate ? parseFloat(draft.healthInsuranceRate) : null,
      };
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = {
          ...defaultCompany,
          ...data,
          healthInsuranceRate: data.healthInsuranceRate != null ? String(data.healthInsuranceRate) : '9.98',
        };
        setCompany(updated);
        setDraft(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem('company_info', JSON.stringify(updated));
        }
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to save company settings');
      }
    } catch (e) {
      console.error(e);
      setError('Network error: Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CompanyInfo, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const data = editing ? draft : company;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Save Success Banner */}
      {saved && (
        <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-4 flex items-center gap-3 animate-fadeIn">
          <span className="text-emerald-600 text-lg font-bold">&#10003;</span>
          <span className="text-xs font-bold text-emerald-800">{t('company.successSave')}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 animate-fadeIn text-red-800">
          <span className="text-lg font-bold">⚠️</span>
          <span className="text-xs font-bold">{error}</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex justify-end gap-3">
        {editing ? (
          <>
            <button onClick={handleCancel} disabled={saving}
              className="px-4 py-2.5 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {t('company.cancelBtn')}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-black transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? '...' : t('company.saveBtn')}
            </button>
          </>
        ) : (
          <button onClick={handleEdit}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-black transition-all cursor-pointer shadow-sm">
            {t('company.editBtn')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card title={t('company.cardBasic')} className="">
          <div className="space-y-4">
            <Field label={t('company.labelName')} value={data.name} editing={editing} onChange={v => handleChange('name', v)} />
            <Field label={t('company.labelNameKana')} value={data.nameKana} editing={editing} onChange={v => handleChange('nameKana', v)} />
            <Field label={t('company.labelRep')} value={data.representative} editing={editing} onChange={v => handleChange('representative', v)} />
            <Field label={t('company.labelRepTitle')} value={getRepTitleLabel(data.representativeTitle, t)} editing={editing} onChange={v => handleChange('representativeTitle', v)} />
            <Field label={t('company.labelEst')} value={data.established} editing={editing} onChange={v => handleChange('established', v)} type="date" />
            <Field label={t('company.labelCapital')} value={data.capital} editing={editing} onChange={v => handleChange('capital', v)} />
            <Field label={t('company.labelEmployees')} value={data.employees} editing={editing} onChange={v => handleChange('employees', v)} />
            <Field label={t('company.labelIndustry')} value={getIndustryLabel(data.industry, t)} editing={editing} onChange={v => handleChange('industry', v)} />
            <Field label={t('company.labelRegNo')} value={data.registrationNumber} editing={editing} onChange={v => handleChange('registrationNumber', v)} />
          </div>
        </Card>

        {/* Contact Info */}
        <Card title={t('company.cardContact')} className="">
          <div className="space-y-4">
            <Field label={t('company.labelAddress')} value={data.address} editing={editing} onChange={v => handleChange('address', v)} textarea />
            <Field label={t('company.labelPhone')} value={data.phone} editing={editing} onChange={v => handleChange('phone', v)} type="tel" />
            <Field label="FAX" value={data.fax} editing={editing} onChange={v => handleChange('fax', v)} type="tel" />
            <Field label={t('company.labelEmail')} value={data.email} editing={editing} onChange={v => handleChange('email', v)} type="email" />
            <Field label={t('company.labelWebsite')} value={data.website} editing={editing} onChange={v => handleChange('website', v)} type="url" />
          </div>
        </Card>

        {/* Bank Info */}
        <Card title={t('company.cardBank')} className="">
          <div className="space-y-4">
            <Field label={t('company.labelBankName')} value={data.bankName} editing={editing} onChange={v => handleChange('bankName', v)} />
            <Field label={t('company.labelBranchName')} value={data.branchName} editing={editing} onChange={v => handleChange('branchName', v)} />
            <Field label={t('company.labelAccountType')} value={getAccountTypeLabel(data.accountType, t)} editing={editing} onChange={v => handleChange('accountType', v)} />
            <Field label={t('company.labelAccountNumber')} value={data.accountNumber} editing={editing} onChange={v => handleChange('accountNumber', v)} />
            <Field label={t('company.labelAccountHolder')} value={data.accountHolder} editing={editing} onChange={v => handleChange('accountHolder', v)} />
          </div>
        </Card>

        {/* Payroll Settings */}
        <Card title={t('company.cardSettings')} className="">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <label className="text-xs font-bold text-slate-500 uppercase sm:w-32 flex-shrink-0">{t('company.labelCutoff')}</label>
              {editing ? (
                <select value={data.salaryCutoffDay} onChange={e => handleChange('salaryCutoffDay', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-350 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-semibold cursor-pointer">
                  <option value="\u672b\u65e5">{t('company.cutoffEnd')}</option>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>{t('company.cutoffDayUnit').replace('{day}', String(d))}</option>
                  ))}
                </select>
              ) : (
                <p className="flex-1 text-sm text-slate-800 font-bold">{data.salaryCutoffDay === '\u672b\u65e5' ? t('company.cutoffEnd') : t('company.cutoffDayUnit').replace('{day}', data.salaryCutoffDay)}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <label className="text-xs font-bold text-slate-500 uppercase sm:w-32 flex-shrink-0">{t('company.labelPayday')}</label>
              {editing ? (
                <select value={data.payday} onChange={e => handleChange('payday', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-350 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-semibold cursor-pointer">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>{t('company.cutoffDayUnit').replace('{day}', String(d))}</option>
                  ))}
                </select>
              ) : (
                <p className="flex-1 text-sm text-slate-800 font-bold">{t('company.cutoffDayUnit').replace('{day}', data.payday)}</p>
              )}
            </div>
            
            {/* Rounding Policy Setting */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <label className="text-xs font-bold text-slate-500 uppercase sm:w-32 flex-shrink-0">{t('company.labelRounding')}</label>
              {editing ? (
                <select value={data.roundingPolicy} onChange={e => handleChange('roundingPolicy', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-355 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-semibold cursor-pointer">
                  <option value="exact">{t('company.roundingExact')}</option>
                  <option value="10min">{t('company.rounding10')}</option>
                  <option value="15min">{t('company.rounding15')}</option>
                  <option value="30min">{t('company.rounding30')}</option>
                </select>
              ) : (
                <p className="flex-1 text-sm text-slate-800 font-bold">
                  {data.roundingPolicy === 'exact' && t('company.roundingExactLabel')}
                  {data.roundingPolicy === '10min' && t('company.rounding10Label')}
                  {data.roundingPolicy === '15min' && t('company.rounding15Label')}
                  {data.roundingPolicy === '30min' && t('company.rounding30Label')}
                </p>
              )}
            </div>

            <Field label={t('company.labelHealthInsuranceRate')} value={data.healthInsuranceRate} editing={editing} onChange={v => handleChange('healthInsuranceRate', v)} />

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <label className="text-xs font-bold text-slate-500 uppercase sm:w-32 flex-shrink-0">{t('company.labelPaymentMethod')}</label>
              <p className="flex-1 text-sm text-slate-800 font-bold">{t('company.labelBankTransfer')}</p>
            </div>
          </div>
          <PayrollStatus cutoffDay={data.salaryCutoffDay} payday={data.payday} t={t} />
        </Card>

        {/* Preview Card */}
        <Card title={t('company.cardPreview')} className="">
          <div className="bg-slate-50 rounded-2xl p-6 border">
            <div className="text-center mb-6">
              <h2 className="text-lg font-black text-slate-850">{data.name}</h2>
              <p className="text-[11px] font-bold text-slate-400">({data.nameKana})</p>
            </div>
            <div className="space-y-3 text-xs">
              <Row label={t('company.labelRep')} value={`${getRepTitleLabel(data.representativeTitle, t)} ${data.representative}`} />
              <Row label={t('company.labelEst')} value={data.established} />
              <Row label={t('company.labelCapital')} value={data.capital} />
              <Row label={t('company.labelEmployees')} value={data.employees} />
              <Row label={t('company.labelIndustry')} value={getIndustryLabel(data.industry, t)} />
              <Row label={t('company.labelAddress')} value={data.address} />
              <Row label={t('company.labelPhone')} value={data.phone} />
              <Row label="FAX" value={data.fax} />
              <Row label="Email" value={data.email} />
              <Row label="Website" value={data.website} />
              <div className="border-t border-slate-200/60 my-2" />
              <Row label={t('company.labelCutoff')} value={data.salaryCutoffDay === '\u672b\u65e5' ? t('company.previewCutoffEnd') : t('company.previewCutoff').replace('{day}', data.salaryCutoffDay)} />
              <Row label={t('company.labelPayday')} value={t('company.previewPayday').replace('{day}', data.payday)} />
              <Row label={t('company.previewRounding')} value={
                data.roundingPolicy === 'exact' ? t('company.previewRoundingExact') :
                data.roundingPolicy === '10min' ? t('company.previewRounding10') :
                data.roundingPolicy === '15min' ? t('company.previewRounding15') : t('company.previewRounding30')
              } />
              <Row label={t('company.labelHealthInsuranceRate')} value={`${data.healthInsuranceRate}%`} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, editing, onChange, type = 'text', textarea = false }: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void;
  type?: string; textarea?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <label className="text-xs font-bold text-slate-500 uppercase sm:w-32 flex-shrink-0">{label}</label>
      {editing ? (
        textarea ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
            className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white" />
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)}
            className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        )
      ) : (
        <p className="flex-1 text-sm text-slate-800 font-bold">{value || '-'}</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-450 w-24 flex-shrink-0 font-bold">{label}</span>
      <span className="text-slate-800 font-extrabold">{value || '-'}</span>
    </div>
  );
}

function PayrollStatus({ cutoffDay, payday, t }: { cutoffDay: string; payday: string; t: any }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const status = useMemo(() => {
    if (!mounted) return null;
    const today = new Date();
    const todayDate = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const cutoff = cutoffDay === '\u672b\u65e5' ? new Date(currentYear, currentMonth + 1, 0).getDate() : Number(cutoffDay);
    const pay = Number(payday);

    let nextCutoff: Date;
    if (todayDate <= cutoff) {
      nextCutoff = new Date(currentYear, currentMonth, cutoff);
    } else {
      nextCutoff = new Date(currentYear, currentMonth + 1, cutoff);
    }

    let nextPay: Date;
    const payDateThisMonth = new Date(nextCutoff.getFullYear(), nextCutoff.getMonth() + 1, pay);
    if (payDateThisMonth > nextCutoff) {
      nextPay = payDateThisMonth;
    } else {
      nextPay = new Date(nextCutoff.getFullYear(), nextCutoff.getMonth() + 2, pay);
    }

    const daysUntilCutoff = Math.ceil((nextCutoff.getTime() - today.getTime()) / 86400000);
    const daysUntilPay = Math.ceil((nextPay.getTime() - today.getTime()) / 86400000);
    const isPayday = todayDate === pay;
    const isCutoffDay = todayDate === cutoff;

    const formatDateStr = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

    return { nextCutoff: formatDateStr(nextCutoff), nextPay: formatDateStr(nextPay), daysUntilCutoff, daysUntilPay, isPayday, isCutoffDay };
  }, [cutoffDay, payday, mounted]);

  if (!mounted || !status) {
    return <div className="mt-4 pt-4 border-t border-slate-200 min-h-[80px]" />;
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`p-3 rounded-2xl ${status.isCutoffDay ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50 border'}`}>
          <div className="flex items-center gap-2 mb-1">
            {status.isCutoffDay && <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
            <p className="text-xs text-slate-505 font-bold">{t('company.alertCutoffTitle')}</p>
          </div>
          <p className="text-sm font-extrabold text-slate-800">{status.nextCutoff}</p>
          <p className="text-xs text-slate-450 font-semibold mt-1">
            {status.isCutoffDay ? t('company.alertCutoffToday') : t('company.alertCutoffDays').replace('{days}', String(status.daysUntilCutoff))}
          </p>
        </div>
        <div className={`p-3 rounded-2xl ${status.isPayday ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border'}`}>
          <div className="flex items-center gap-2 mb-1">
            {status.isPayday && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
            <p className="text-xs text-slate-505 font-bold">{t('company.alertPaydayTitle')}</p>
          </div>
          <p className="text-sm font-extrabold text-slate-800">{status.nextPay}</p>
          <p className="text-xs text-slate-450 font-semibold mt-1">
            {status.isPayday ? t('company.alertPaydayToday') : t('company.alertPaydayDays').replace('{days}', String(status.daysUntilPay))}
          </p>
        </div>
      </div>
    </div>
  );
}
