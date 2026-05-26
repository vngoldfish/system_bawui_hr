'use client';

import { useState, useMemo, useEffect } from 'react';
import Card from '@/components/common/Card';

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
}

const defaultCompany: CompanyInfo = {
  name: '株式会社ロング',
  nameKana: 'カブシキガイシャロング',
  representative: 'ロン グエン',
  representativeTitle: '代表取締役',
  established: '2015-04-01',
  capital: '10,000,000円',
  employees: '14名',
  industry: 'IT・ソフトウェア',
  registrationNumber: 'T1234567890123',
  address: '〒100-0001 東京都千代田区千代田1-1-1 ロングビル3F',
  phone: '03-1234-5678',
  fax: '03-1234-5679',
  email: 'info@long-corp.jp',
  website: 'https://www.long-corp.jp',
  bankName: '三菱UFJ銀行',
  branchName: '東京支店',
  accountType: '普通',
  accountNumber: '1234567',
  accountHolder: 'カブシキガイシャロング',
  salaryCutoffDay: '末日',
  payday: '25',
  roundingPolicy: 'exact',
};

export default function CompanyClient({ initialData }: { initialData?: Partial<CompanyInfo> }) {
  const [company, setCompany] = useState<CompanyInfo>(defaultCompany);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CompanyInfo>(defaultCompany);
  const [saved, setSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedInfo = localStorage.getItem('company_info');
      if (savedInfo) {
        try {
          const parsed = JSON.parse(savedInfo);
          const loaded = { ...defaultCompany, ...parsed, ...initialData };
          setCompany(loaded);
          setDraft(loaded);
        } catch (e) {
          console.error('Failed to load company info:', e);
        }
      } else {
        const loaded = { ...defaultCompany, ...initialData };
        setCompany(loaded);
        setDraft(loaded);
      }
    }
  }, [initialData]);

  const handleEdit = () => {
    setDraft(company);
    setEditing(true);
    setSaved(false);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSave = () => {
    setCompany(draft);
    if (typeof window !== 'undefined') {
      localStorage.setItem('company_info', JSON.stringify(draft));
    }
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (field: keyof CompanyInfo, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const data = editing ? draft : company;

  return (
    <>
      {/* Save Success Banner */}
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-emerald-600 text-lg">&#10003;</span>
          <span className="text-sm font-semibold text-emerald-800">会社情報を保存しました</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex justify-end gap-3">
        {editing ? (
          <>
            <button onClick={handleCancel}
              className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-50 text-slate-650 rounded-xl text-sm font-bold transition-colors cursor-pointer">
              キャンセル
            </button>
            <button onClick={handleSave}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-black transition-colors cursor-pointer shadow-sm">
              変更を保存
            </button>
          </>
        ) : (
          <button onClick={handleEdit}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-black transition-colors cursor-pointer shadow-sm">
            会社情報を編集
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card title="基本情報">
          <div className="space-y-4">
            <Field label="会社名" value={data.name} editing={editing} onChange={v => handleChange('name', v)} />
            <Field label="会社名（カナ）" value={data.nameKana} editing={editing} onChange={v => handleChange('nameKana', v)} />
            <Field label="代表者" value={data.representative} editing={editing} onChange={v => handleChange('representative', v)} />
            <Field label="代表者役職" value={data.representativeTitle} editing={editing} onChange={v => handleChange('representativeTitle', v)} />
            <Field label="設立日" value={data.established} editing={editing} onChange={v => handleChange('established', v)} type="date" />
            <Field label="資本金" value={data.capital} editing={editing} onChange={v => handleChange('capital', v)} />
            <Field label="従業員数" value={data.employees} editing={editing} onChange={v => handleChange('employees', v)} />
            <Field label="業種" value={data.industry} editing={editing} onChange={v => handleChange('industry', v)} />
            <Field label="法人番号" value={data.registrationNumber} editing={editing} onChange={v => handleChange('registrationNumber', v)} />
          </div>
        </Card>

        {/* Contact Info */}
        <Card title="連絡先">
          <div className="space-y-4">
            <Field label="住所" value={data.address} editing={editing} onChange={v => handleChange('address', v)} textarea />
            <Field label="電話番号" value={data.phone} editing={editing} onChange={v => handleChange('phone', v)} type="tel" />
            <Field label="FAX" value={data.fax} editing={editing} onChange={v => handleChange('fax', v)} type="tel" />
            <Field label="メールアドレス" value={data.email} editing={editing} onChange={v => handleChange('email', v)} type="email" />
            <Field label="ウェブサイト" value={data.website} editing={editing} onChange={v => handleChange('website', v)} type="url" />
          </div>
        </Card>

        {/* Bank Info */}
        <Card title="銀行口座情報">
          <div className="space-y-4">
            <Field label="銀行名" value={data.bankName} editing={editing} onChange={v => handleChange('bankName', v)} />
            <Field label="支店名" value={data.branchName} editing={editing} onChange={v => handleChange('branchName', v)} />
            <Field label="口座種別" value={data.accountType} editing={editing} onChange={v => handleChange('accountType', v)} />
            <Field label="口座番号" value={data.accountNumber} editing={editing} onChange={v => handleChange('accountNumber', v)} />
            <Field label="口座名義" value={data.accountHolder} editing={editing} onChange={v => handleChange('accountHolder', v)} />
          </div>
        </Card>

        {/* Payroll Settings */}
        <Card title="給与設定 & 勤怠計算ルール">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <label className="text-sm font-medium text-slate-650 sm:w-32 flex-shrink-0 font-bold">給与締め日</label>
              {editing ? (
                <select value={data.salaryCutoffDay} onChange={e => handleChange('salaryCutoffDay', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-350 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none">
                  <option value="末日">末日</option>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>{d}日</option>
                  ))}
                </select>
              ) : (
                <p className="flex-1 text-sm text-slate-800">{data.salaryCutoffDay === '末日' ? '末日' : `${data.salaryCutoffDay}日`}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <label className="text-sm font-medium text-slate-650 sm:w-32 flex-shrink-0 font-bold">給与支払日</label>
              {editing ? (
                <select value={data.payday} onChange={e => handleChange('payday', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-350 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>{d}日</option>
                  ))}
                </select>
              ) : (
                <p className="flex-1 text-sm text-slate-800">{data.payday}日</p>
              )}
            </div>
            
            {/* Rounding Policy Setting */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <label className="text-sm font-medium text-slate-650 sm:w-32 flex-shrink-0 font-bold">勤怠丸め単位</label>
              {editing ? (
                <select value={data.roundingPolicy} onChange={e => handleChange('roundingPolicy', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-355 bg-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none">
                  <option value="exact">1分単位 (切り捨てなし / 実働そのまま)</option>
                  <option value="15min">15分単位 (出勤切り上げ / 退勤切り捨て)</option>
                  <option value="30min">30分単位 (出勤切り上げ / 退勤切り捨て)</option>
                </select>
              ) : (
                <p className="flex-1 text-sm text-slate-800 font-semibold">
                  {data.roundingPolicy === 'exact' && '1分単位 (切り捨てなし)'}
                  {data.roundingPolicy === '15min' && '15分単位 (出勤切り上げ/退勤切り捨て)'}
                  {data.roundingPolicy === '30min' && '30分単位 (出勤切り上げ/退勤切り捨て)'}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <label className="text-sm font-medium text-slate-650 sm:w-32 flex-shrink-0">支払方法</label>
              <p className="flex-1 text-sm text-slate-800">銀行振込</p>
            </div>
          </div>
          <PayrollStatus cutoffDay={data.salaryCutoffDay} payday={data.payday} />
        </Card>

        {/* Preview Card */}
        <Card title="会社概要プレビュー">
          <div className="bg-slate-50 rounded-lg p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{data.name}</h2>
              <p className="text-sm text-slate-500">({data.nameKana})</p>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="代表者" value={`${data.representativeTitle} ${data.representative}`} />
              <Row label="設立" value={data.established} />
              <Row label="資本金" value={data.capital} />
              <Row label="従業員" value={data.employees} />
              <Row label="業種" value={data.industry} />
              <Row label="住所" value={data.address} />
              <Row label="TEL" value={data.phone} />
              <Row label="FAX" value={data.fax} />
              <Row label="Email" value={data.email} />
              <Row label="Website" value={data.website} />
              <div className="border-t border-slate-200 my-2" />
              <Row label="締め日" value={data.salaryCutoffDay === '末日' ? '末日' : `毎月${data.salaryCutoffDay}日`} />
              <Row label="支払日" value={`毎月${data.payday}日`} />
              <Row label="時間丸め" value={
                data.roundingPolicy === 'exact' ? '1分単位' :
                data.roundingPolicy === '15min' ? '15分単位 (15m)' : '30分単位 (30m)'
              } />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function Field({ label, value, editing, onChange, type = 'text', textarea = false }: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void;
  type?: string; textarea?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <label className="text-sm font-medium text-slate-600 sm:w-32 flex-shrink-0 font-bold">{label}</label>
      {editing ? (
        textarea ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
            className="flex-1 px-3 py-2 border border-slate-350 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none" />
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-350 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
        )
      ) : (
        <p className="flex-1 text-sm text-slate-800">{value || '-'}</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 w-18 flex-shrink-0">{label}</span>
      <span className="text-slate-850 font-semibold">{value || '-'}</span>
    </div>
  );
}

function PayrollStatus({ cutoffDay, payday }: { cutoffDay: string; payday: string }) {
  const status = useMemo(() => {
    const today = new Date();
    const todayDate = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const cutoff = cutoffDay === '末日' ? new Date(currentYear, currentMonth + 1, 0).getDate() : Number(cutoffDay);
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

    const formatDate = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

    return { nextCutoff: formatDate(nextCutoff), nextPay: formatDate(nextPay), daysUntilCutoff, daysUntilPay, isPayday, isCutoffDay };
  }, [cutoffDay, payday]);

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg ${status.isCutoffDay ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            {status.isCutoffDay && <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
            <p className="text-xs text-slate-505">次回締め日</p>
          </div>
          <p className="text-sm font-bold text-slate-800">{status.nextCutoff}</p>
          <p className="text-xs text-slate-500 mt-1">
            {status.isCutoffDay ? '本日が締め日です' : `あと${status.daysUntilCutoff}日`}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${status.isPayday ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            {status.isPayday && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
            <p className="text-xs text-slate-505">次回支払日</p>
          </div>
          <p className="text-sm font-bold text-slate-800">{status.nextPay}</p>
          <p className="text-xs text-slate-500 mt-1">
            {status.isPayday ? '本日が支払日です — 給与明細を発行してください' : `あと${status.daysUntilPay}日`}
          </p>
        </div>
      </div>
    </div>
  );
}
