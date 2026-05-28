'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';

interface RateItem {
  id: string; name: string; nameKana: string;
  companyRate: number; employeeRate: number;
  companyFixed: number; employeeFixed: number;
  type: 'rate' | 'fixed' | 'both';
  category: 'insurance' | 'tax' | 'allowance' | 'deduction';
  description: string;
}

interface ChangeLog {
  id: string; itemId: string; itemName: string;
  field: string; oldValue: string; newValue: string;
  reason: string; timestamp: string; user: string;
}

interface HealthInsuranceSettings {
  baseRate: number;
  careInsuranceRate: number;
  prefecture: string;
  standardMonthlyMin: number;
  standardMonthlyMax: number;
}

interface PensionSettings {
  totalRate: number;
  companyRate: number;
  employeeRate: number;
  standardMonthlyMin: number;
  standardMonthlyMax: number;
}

interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
  deduction: number;
}

const defaultHealth: HealthInsuranceSettings = {
  baseRate: 9.98,
  careInsuranceRate: 1.58,
  prefecture: '東京都',
  standardMonthlyMin: 58000,
  standardMonthlyMax: 1390000,
};

const defaultPension: PensionSettings = {
  totalRate: 18.3,
  companyRate: 9.15,
  employeeRate: 9.15,
  standardMonthlyMin: 88000,
  standardMonthlyMax: 650000,
};

const defaultTaxBrackets: TaxBracket[] = [
  { min: 0, max: 1000, rate: 5, deduction: 0 },
  { min: 1000, max: 1949, rate: 10, deduction: 9750 },
  { min: 1950, max: 3299, rate: 20, deduction: 42750 },
  { min: 3300, max: 6949, rate: 23, deduction: 63600 },
  { min: 6950, max: 8999, rate: 33, deduction: 153600 },
  { min: 9000, max: 17999, rate: 40, deduction: 279600 },
  { min: 18000, max: null, rate: 45, deduction: 279600 },
];

const defaultRates: RateItem[] = [
  { id: 'employment', name: '雇用保険', nameKana: 'こようほけん', companyRate: 0.6, employeeRate: 0.3, companyFixed: 0, employeeFixed: 0, type: 'rate', category: 'insurance', description: '一般の事業' },
  { id: 'workers', name: '労災保険', nameKana: 'ろうさいほけん', companyRate: 0.3, employeeRate: 0, companyFixed: 0, employeeFixed: 0, type: 'rate', category: 'insurance', description: '一般の事業（従業員負担なし）' },
  { id: 'resident_tax', name: '住民税', nameKana: 'じゅうみんぜい', companyRate: 0, employeeRate: 0, companyFixed: 0, employeeFixed: 0, type: 'fixed', category: 'tax', description: '特別徴収（前年度所得に基づく）' },
  { id: 'transport', name: '通勤手当', nameKana: 'つうきんてあて', companyRate: 0, employeeRate: 0, companyFixed: 15000, employeeFixed: 0, type: 'fixed', category: 'allowance', description: '定期代相当（非課税限度額15万円/月）' },
  { id: 'housing', name: '住宅手当', nameKana: 'じゅうたくてあて', companyRate: 0, employeeRate: 0, companyFixed: 30000, employeeFixed: 0, type: 'fixed', category: 'allowance', description: '社宅・家賃補助' },
  { id: 'meal', name: '食事手当', nameKana: 'しょくじてあて', companyRate: 0, employeeRate: 0, companyFixed: 10000, employeeFixed: 0, type: 'fixed', category: 'allowance', description: '昼食補助' },
  { id: 'family', name: '家族手当', nameKana: 'かぞくてあて', companyRate: 0, employeeRate: 0, companyFixed: 5000, employeeFixed: 0, type: 'fixed', category: 'allowance', description: '扶養家族1名あたり' },
  { id: 'overtime', name: '時間外手当', nameKana: 'じかんがいてあて', companyRate: 0, employeeRate: 0, companyFixed: 0, employeeFixed: 0, type: 'rate', category: 'allowance', description: '法定時間外労働（割増率25%以上）' },
  { id: 'late_night', name: '深夜手当', nameKana: 'しんやてあて', companyRate: 0, employeeRate: 0, companyFixed: 0, employeeFixed: 0, type: 'rate', category: 'allowance', description: '22時〜5時労働（割増率25%以上）' },
];

const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

const categoryColor = (c: string) =>
  c === 'insurance' ? 'bg-blue-100 text-blue-700' :
  c === 'tax' ? 'bg-red-100 text-red-700' :
  c === 'allowance' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700';

const getItemTranslation = (id: string, fallbackName: string, fallbackDesc: string, t: any) => {
  switch (id) {
    case 'employment':
      return { name: t('benefits.employmentInsurance'), desc: t('salaryTable.generalBusiness') };
    case 'workers':
      return { name: t('benefits.workersComp'), desc: t('salaryTable.generalBusinessNoEmp') };
    case 'resident_tax':
      return { name: t('payroll.residentTaxSubject'), desc: t('salaryTable.specialCollection') };
    case 'transport':
      return { name: t('benefits.commutingAllowance'), desc: t('salaryTable.commuteLimit') };
    case 'housing':
      return { name: t('benefits.housingAllowance'), desc: t('salaryTable.housingSubLabel') };
    case 'meal':
      return { name: t('benefits.mealAllowance'), desc: t('salaryTable.mealSubLabel') };
    case 'family':
      return { name: t('benefits.familyAllowance'), desc: t('salaryTable.familySubLabel') };
    case 'overtime':
      return { name: t('benefits.overtimeAllowance'), desc: t('salaryTable.overtimeSubLabel') };
    case 'late_night': {
      const isVi = t('benefits.mealAllowance').includes('ăn');
      const isEn = t('benefits.mealAllowance').includes('Meal');
      const isZh = t('benefits.mealAllowance').includes('餐');
      const isTh = t('benefits.mealAllowance').includes('อาหาร');
      let name = fallbackName;
      if (isVi) name = 'Phụ cấp làm đêm';
      else if (isEn) name = 'Late-night Allowance';
      else if (isZh) name = '深夜津贴';
      else if (isTh) name = 'ค่ากะดึก';
      return { name, desc: t('salaryTable.lateNightSubLabel') };
    }
    default:
      return { name: fallbackName, desc: fallbackDesc };
  }
};

function logChange(
  setChangeLog: React.Dispatch<React.SetStateAction<ChangeLog[]>>,
  itemId: string, itemName: string, field: string, oldVal: string, newVal: string, reason: string, user: string
) {
  const now = new Date();
  const ts = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  setChangeLog(prev => [{
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemId, itemName, field, oldValue: oldVal, newValue: newVal, reason, timestamp: ts, user,
  }, ...prev]);
}

// ─── Health Insurance Section ─────────────────────────────────────
function HealthInsuranceSection({ settings, onChange, changeLog, setChangeLog }: {
  settings: HealthInsuranceSettings;
  onChange: (s: HealthInsuranceSettings) => void;
  changeLog: ChangeLog[];
  setChangeLog: React.Dispatch<React.SetStateAction<ChangeLog[]>>;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings);
  const [reason, setReason] = useState('');

  const handleSave = () => {
    if (!reason.trim()) return;
    const adminLabel = t('salaryTable.historyAdmin');
    const healthLabel = t('salaryTable.healthTitle');
    if (draft.baseRate !== settings.baseRate) logChange(setChangeLog, 'health', healthLabel, t('salaryTable.baseRate'), `${settings.baseRate}%`, `${draft.baseRate}%`, reason, adminLabel);
    if (draft.careInsuranceRate !== settings.careInsuranceRate) logChange(setChangeLog, 'health', healthLabel, t('salaryTable.careTotal'), `${settings.careInsuranceRate}%`, `${draft.careInsuranceRate}%`, reason, adminLabel);
    if (draft.prefecture !== settings.prefecture) logChange(setChangeLog, 'health', healthLabel, t('salaryTable.prefecture'), settings.prefecture, draft.prefecture, reason, adminLabel);
    if (draft.standardMonthlyMin !== settings.standardMonthlyMin) logChange(setChangeLog, 'health', healthLabel, t('salaryTable.standardMin'), `¥${settings.standardMonthlyMin.toLocaleString()}`, `¥${draft.standardMonthlyMin.toLocaleString()}`, reason, adminLabel);
    if (draft.standardMonthlyMax !== settings.standardMonthlyMax) logChange(setChangeLog, 'health', healthLabel, t('salaryTable.standardMax'), `¥${settings.standardMonthlyMax.toLocaleString()}`, `¥${draft.standardMonthlyMax.toLocaleString()}`, reason, adminLabel);
    onChange(draft);
    setEditing(false);
    setReason('');
  };

  const companyHalf = (settings.baseRate / 2).toFixed(2);
  const employeeHalf = (settings.baseRate / 2).toFixed(2);
  const careCompany = (settings.careInsuranceRate / 2).toFixed(2);
  const careEmployee = (settings.careInsuranceRate / 2).toFixed(2);

  return (
    <Card title={t('salaryTable.healthTitle')}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xs text-slate-500">{t('salaryTable.healthSub')}</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setDraft(settings); setReason(''); }}
              className="px-3 py-1.5 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">{t('salaryTable.cancelBtn')}</button>
            <button onClick={handleSave} disabled={!reason.trim()}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">{t('salaryTable.saveBtn')}</button>
          </div>
        ) : (
          <button onClick={() => { setDraft(settings); setEditing(true); }}
            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">{t('salaryTable.editBtn')}</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Settings */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">{t('salaryTable.prefecture')}</label>
            {editing ? (
              <select value={draft.prefecture} onChange={e => setDraft(p => ({ ...p, prefecture: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
                {prefectures.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <p className="text-sm font-medium text-slate-800 mt-1">{settings.prefecture}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">{t('salaryTable.baseRate')}</label>
            {editing ? (
              <input type="number" step="0.01" value={draft.baseRate}
                onChange={e => setDraft(p => ({ ...p, baseRate: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            ) : (
              <p className="text-sm font-medium text-slate-800 mt-1">{settings.baseRate}%</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">{t('salaryTable.careTotal')}</label>
            {editing ? (
              <input type="number" step="0.01" value={draft.careInsuranceRate}
                onChange={e => setDraft(p => ({ ...p, careInsuranceRate: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            ) : (
              <p className="text-sm font-medium text-slate-800 mt-1">{settings.careInsuranceRate}%</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">{t('salaryTable.standardMin')}</label>
              {editing ? (
                <input type="number" step="1000" value={draft.standardMonthlyMin}
                  onChange={e => setDraft(p => ({ ...p, standardMonthlyMin: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              ) : (
                <p className="text-sm text-slate-800 mt-1">¥{settings.standardMonthlyMin.toLocaleString()}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">{t('salaryTable.standardMax')}</label>
              {editing ? (
                <input type="number" step="10000" value={draft.standardMonthlyMax}
                  onChange={e => setDraft(p => ({ ...p, standardMonthlyMax: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              ) : (
                <p className="text-sm text-slate-800 mt-1">¥{settings.standardMonthlyMax.toLocaleString()}</p>
              )}
            </div>
          </div>
          {editing && (
            <div>
              <label className="text-xs font-medium text-red-600">{t('salaryTable.reasonRequired')}</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder={t('salaryTable.reasonPlaceholder')}
                className="w-full mt-1 px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 resize-none" />
            </div>
          )}
        </div>

        {/* Right: Calculation breakdown */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-600 mb-3">{t('salaryTable.burdenBreakdown')}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">{t('salaryTable.totalRate')}</span><span className="font-medium">{settings.baseRate}%</span></div>
            <div className="flex justify-between pl-4"><span className="text-blue-600">{t('salaryTable.companyHalf')}</span><span className="font-medium text-blue-600">{companyHalf}%</span></div>
            <div className="flex justify-between pl-4"><span className="text-orange-600">{t('salaryTable.employeeHalf')}</span><span className="font-medium text-orange-600">{employeeHalf}%</span></div>
            <div className="border-t border-slate-200 my-2" />
            <div className="flex justify-between"><span className="text-slate-500">{t('salaryTable.careTotal')}</span><span className="font-medium">{settings.careInsuranceRate}%</span></div>
            <div className="flex justify-between pl-4"><span className="text-blue-600">{t('salaryTable.companyHalf')}</span><span className="font-medium text-blue-600">{careCompany}%</span></div>
            <div className="flex justify-between pl-4"><span className="text-orange-600">{t('salaryTable.employeeHalf')}</span><span className="font-medium text-orange-600">{careEmployee}%</span></div>
            <div className="border-t border-slate-200 my-2" />
            <div className="flex justify-between font-medium"><span className="text-slate-700">{t('salaryTable.under40Rate')}</span><span>{settings.baseRate}%</span></div>
            <div className="flex justify-between font-medium"><span className="text-slate-700">{t('salaryTable.over40Rate')}</span><span>{(settings.baseRate + settings.careInsuranceRate).toFixed(2)}%</span></div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Pension Section ──────────────────────────────────────────────
function PensionSection({ settings, onChange, changeLog, setChangeLog }: {
  settings: PensionSettings;
  onChange: (s: PensionSettings) => void;
  changeLog: ChangeLog[];
  setChangeLog: React.Dispatch<React.SetStateAction<ChangeLog[]>>;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings);
  const [reason, setReason] = useState('');

  const handleSave = () => {
    if (!reason.trim()) return;
    const adminLabel = t('salaryTable.historyAdmin');
    const pensionLabel = t('salaryTable.pensionTitle');
    if (draft.totalRate !== settings.totalRate) logChange(setChangeLog, 'pension', pensionLabel, t('salaryTable.totalRate'), `${settings.totalRate}%`, `${draft.totalRate}%`, reason, adminLabel);
    if (draft.companyRate !== settings.companyRate) logChange(setChangeLog, 'pension', pensionLabel, t('salaryTable.pensionCompany'), `${settings.companyRate}%`, `${draft.companyRate}%`, reason, adminLabel);
    if (draft.employeeRate !== settings.employeeRate) logChange(setChangeLog, 'pension', pensionLabel, t('salaryTable.pensionEmployee'), `${settings.employeeRate}%`, `${draft.employeeRate}%`, reason, adminLabel);
    if (draft.standardMonthlyMin !== settings.standardMonthlyMin) logChange(setChangeLog, 'pension', pensionLabel, t('salaryTable.standardMin'), `¥${settings.standardMonthlyMin.toLocaleString()}`, `¥${draft.standardMonthlyMin.toLocaleString()}`, reason, adminLabel);
    if (draft.standardMonthlyMax !== settings.standardMonthlyMax) logChange(setChangeLog, 'pension', pensionLabel, t('salaryTable.standardMax'), `¥${settings.standardMonthlyMax.toLocaleString()}`, `¥${draft.standardMonthlyMax.toLocaleString()}`, reason, adminLabel);
    onChange(draft);
    setEditing(false);
    setReason('');
  };

  return (
    <Card title={t('salaryTable.pensionTitle')}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-slate-500">{t('salaryTable.pensionSub')}</p>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setDraft(settings); setReason(''); }}
              className="px-3 py-1.5 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">{t('salaryTable.cancelBtn')}</button>
            <button onClick={handleSave} disabled={!reason.trim()}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">{t('salaryTable.saveBtn')}</button>
          </div>
        ) : (
          <button onClick={() => { setDraft(settings); setEditing(true); }}
            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">{t('salaryTable.editBtn')}</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">{t('salaryTable.pensionTotal')}</label>
            {editing ? (
              <input type="number" step="0.01" value={draft.totalRate}
                onChange={e => {
                  const total = Number(e.target.value);
                  setDraft(p => ({ ...p, totalRate: total, companyRate: total / 2, employeeRate: total / 2 }));
                }}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            ) : (
              <p className="text-lg font-bold text-slate-800 mt-1">{settings.totalRate}%</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-blue-600">{t('salaryTable.pensionCompany')}</label>
              {editing ? (
                <input type="number" step="0.01" value={draft.companyRate}
                  onChange={e => setDraft(p => ({ ...p, companyRate: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border border-blue-300 rounded-lg text-sm" />
              ) : (
                <p className="text-sm font-medium text-blue-600 mt-1">{settings.companyRate}%</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-orange-600">{t('salaryTable.pensionEmployee')}</label>
              {editing ? (
                <input type="number" step="0.01" value={draft.employeeRate}
                  onChange={e => setDraft(p => ({ ...p, employeeRate: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border border-orange-300 rounded-lg text-sm" />
              ) : (
                <p className="text-sm font-medium text-orange-600 mt-1">{settings.employeeRate}%</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">{t('salaryTable.standardMin')}</label>
              {editing ? (
                <input type="number" step="1000" value={draft.standardMonthlyMin}
                  onChange={e => setDraft(p => ({ ...p, standardMonthlyMin: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              ) : (
                <p className="text-sm text-slate-800 mt-1">¥{settings.standardMonthlyMin.toLocaleString()}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">{t('salaryTable.standardMax')}</label>
              {editing ? (
                <input type="number" step="10000" value={draft.standardMonthlyMax}
                  onChange={e => setDraft(p => ({ ...p, standardMonthlyMax: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              ) : (
                <p className="text-sm text-slate-800 mt-1">¥{settings.standardMonthlyMax.toLocaleString()}</p>
              )}
            </div>
          </div>
          {editing && (
            <div>
              <label className="text-xs font-medium text-red-600">{t('salaryTable.reasonRequired')}</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder={t('salaryTable.reasonPlaceholder')}
                className="w-full mt-1 px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 resize-none" />
            </div>
          )}
        </div>

        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-600 mb-3">{t('salaryTable.burdenBreakdown')}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">{t('salaryTable.totalRate')}</span><span className="font-bold text-lg">{settings.totalRate}%</span></div>
            <div className="flex justify-between pl-4"><span className="text-blue-600">{t('salaryTable.companyHalf')}</span><span className="font-medium text-blue-600">{settings.companyRate}%</span></div>
            <div className="flex justify-between pl-4"><span className="text-orange-600">{t('salaryTable.employeeHalf')}</span><span className="font-medium text-orange-600">{settings.employeeRate}%</span></div>
            <div className="border-t border-slate-200 my-2" />
            <p className="text-xs text-slate-500">{t('salaryTable.pensionExample')}</p>
            <div className="flex justify-between"><span className="text-blue-600">{t('salaryTable.companyBurden')}</span><span>¥{Math.round(300000 * settings.companyRate / 100).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-orange-600">{t('salaryTable.employeeBurden')}</span><span>¥{Math.round(300000 * settings.employeeRate / 100).toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Income Tax Section ───────────────────────────────────────────
function IncomeTaxSection({ brackets, onChange, changeLog, setChangeLog }: {
  brackets: TaxBracket[];
  onChange: (b: TaxBracket[]) => void;
  changeLog: ChangeLog[];
  setChangeLog: React.Dispatch<React.SetStateAction<ChangeLog[]>>;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(brackets);
  const [reason, setReason] = useState('');

  const handleSave = () => {
    if (!reason.trim()) return;
    const adminLabel = t('salaryTable.historyAdmin');
    const taxLabel = t('salaryTable.taxTitle');
    draft.forEach((b, i) => {
      const orig = brackets[i];
      if (!orig) return;
      if (orig.rate !== b.rate) {
        logChange(setChangeLog, 'income_tax', taxLabel, `${t('salaryTable.taxRate')}(${orig.min}${t('salaryTable.aboveSuffix')})`, `${orig.rate}%`, `${b.rate}%`, reason, adminLabel);
      }
      if (orig.deduction !== b.deduction) {
        logChange(setChangeLog, 'income_tax', taxLabel, `${t('salaryTable.taxDeduction')}(${orig.min}${t('salaryTable.aboveSuffix')})`, `¥${orig.deduction.toLocaleString()}`, `¥${b.deduction.toLocaleString()}`, reason, adminLabel);
      }
    });
    onChange(draft);
    setEditing(false);
    setReason('');
  };

  return (
    <Card title={t('salaryTable.taxTitle')}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-slate-500">{t('salaryTable.taxSub')}</p>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setDraft(brackets); setReason(''); }}
              className="px-3 py-1.5 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">{t('salaryTable.cancelBtn')}</button>
            <button onClick={handleSave} disabled={!reason.trim()}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">{t('salaryTable.saveBtn')}</button>
          </div>
        ) : (
          <button onClick={() => { setDraft(brackets); setEditing(true); }}
            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">{t('salaryTable.editBtn')}</button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{t('salaryTable.bracketCol')}</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">{t('salaryTable.rateCol')}</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">{t('salaryTable.deductionCol')}</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">{t('salaryTable.memoCol')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(editing ? draft : brackets).map((b, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-sm text-slate-800">
                  {editing ? (
                    <div className="flex gap-2 items-center">
                      <input type="number" value={b.min} onChange={e => {
                        const v = Number(e.target.value);
                        setDraft(p => p.map((x, j) => j === i ? { ...x, min: v } : x));
                      }} className="w-20 px-2 py-1 border border-slate-300 rounded text-sm" />
                      <span>〜</span>
                      <input type="number" value={b.max ?? ''} onChange={e => {
                        const v = e.target.value === '' ? null : Number(e.target.value);
                        setDraft(p => p.map((x, j) => j === i ? { ...x, max: v } : x));
                      }} placeholder={t('salaryTable.noLimit')} className="w-20 px-2 py-1 border border-slate-300 rounded text-sm" />
                    </div>
                  ) : (
                    <span>{b.min.toLocaleString()}万 〜 {b.max ? `${b.max.toLocaleString()}万` : t('salaryTable.aboveSuffix')}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-right">
                  {editing ? (
                    <input type="number" step="0.1" value={b.rate} onChange={e => {
                      const v = Number(e.target.value);
                      setDraft(p => p.map((x, j) => j === i ? { ...x, rate: v } : x));
                    }} className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-right" />
                  ) : (
                    <span className="font-medium text-red-600">{b.rate}%</span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-right">
                  {editing ? (
                    <input type="number" step="1000" value={b.deduction} onChange={e => {
                      const v = Number(e.target.value);
                      setDraft(p => p.map((x, j) => j === i ? { ...x, deduction: v } : x));
                    }} className="w-24 px-2 py-1 border border-slate-300 rounded text-sm text-right" />
                  ) : (
                    <span>¥{b.deduction.toLocaleString()}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-slate-500">
                  {b.rate === 5 ? t('salaryTable.lowestTax') : b.rate === 45 ? t('salaryTable.highestTax') : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="mt-4">
          <label className="text-xs font-medium text-red-600">{t('salaryTable.reasonRequired')}</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder={t('salaryTable.reasonPlaceholder')}
            className="w-full mt-1 px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 resize-none" />
        </div>
      )}

      {/* Tax calculation example */}
      <div className="mt-4 bg-slate-50 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-slate-600 mb-3">{t('salaryTable.calcExample')}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[20, 40, 80].map(salary => {
            const bracket = brackets.find(b => salary >= b.min && (b.max === null || salary <= b.max));
            const tax = bracket ? Math.max(0, Math.round(salary * 10000 * bracket.rate / 100 - bracket.deduction)) : 0;
            return (
              <div key={salary} className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500">{t('payroll.baseSalaryLabel')} {salary}{t('salaryTable.aboveSuffix')}</p>
                <p className="text-lg font-bold text-red-600">¥{tax.toLocaleString()}</p>
                <p className="text-xs text-slate-400">{t('salaryTable.taxRate')}{bracket?.rate}% / {t('salaryTable.taxDeduction')} ¥{bracket?.deduction.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ─── Edit Modal for Other Rates ───────────────────────────────────
function EditModal({ item, onSave, onClose }: {
  item: RateItem; onSave: (updated: RateItem, reason: string) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState({ ...item });
  const [reason, setReason] = useState('');

  const trans = getItemTranslation(item.id, item.name, item.description, t);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">{trans.name} - {t('salaryTable.editBtn')}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
          </div>
          <p className="text-xs text-slate-500 mb-4">{trans.desc}</p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">{t('salaryTable.companyRate')}</label>
              <input type="number" step="0.01" value={draft.companyRate}
                onChange={e => setDraft(p => ({ ...p, companyRate: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">{t('salaryTable.employeeRate')}</label>
              <input type="number" step="0.01" value={draft.employeeRate}
                onChange={e => setDraft(p => ({ ...p, employeeRate: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">{t('salaryTable.companyFixed')}</label>
              <input type="number" step="100" value={draft.companyFixed}
                onChange={e => setDraft(p => ({ ...p, companyFixed: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">{t('salaryTable.employeeFixed')}</label>
              <input type="number" step="100" value={draft.employeeFixed}
                onChange={e => setDraft(p => ({ ...p, employeeFixed: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-red-600">{t('salaryTable.reasonRequired')}</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder={t('salaryTable.reasonPlaceholder')}
                className="w-full mt-1 px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 text-sm">{t('salaryTable.cancelBtn')}</button>
            <button onClick={() => { if (reason.trim()) onSave(draft, reason); }} disabled={!reason.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-40">{t('salaryTable.saveBtn')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function SalaryTableClient() {
  const { t, locale } = useI18n();
  const [rates, setRates] = useState<RateItem[]>(defaultRates);
  const [health, setHealth] = useState<HealthInsuranceSettings>(defaultHealth);
  const [pension, setPension] = useState<PensionSettings>(defaultPension);
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>(defaultTaxBrackets);
  const [changeLog, setChangeLog] = useState<ChangeLog[]>([]);
  const [editingItem, setEditingItem] = useState<RateItem | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [saved, setSaved] = useState(false);

  const handleSaveRate = (updated: RateItem, reason: string) => {
    const original = rates.find(r => r.id === updated.id);
    if (!original) return;
    const trans = getItemTranslation(updated.id, updated.name, updated.description, t);
    const adminLabel = t('salaryTable.historyAdmin');
    if (original.companyRate !== updated.companyRate) logChange(setChangeLog, updated.id, trans.name, t('salaryTable.companyRate'), `${original.companyRate}%`, `${updated.companyRate}%`, reason, adminLabel);
    if (original.employeeRate !== updated.employeeRate) logChange(setChangeLog, updated.id, trans.name, t('salaryTable.employeeRate'), `${original.employeeRate}%`, `${updated.employeeRate}%`, reason, adminLabel);
    if (original.companyFixed !== updated.companyFixed) logChange(setChangeLog, updated.id, trans.name, t('salaryTable.companyFixed'), `¥${original.companyFixed.toLocaleString()}`, `¥${updated.companyFixed.toLocaleString()}`, reason, adminLabel);
    if (original.employeeFixed !== updated.employeeFixed) logChange(setChangeLog, updated.id, trans.name, t('salaryTable.employeeFixed'), `¥${original.employeeFixed.toLocaleString()}`, `¥${updated.employeeFixed.toLocaleString()}`, reason, adminLabel);
    setRates(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditingItem(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const filtered = activeCategory === 'all' ? rates : rates.filter(r => r.category === activeCategory);

  const stats = useMemo(() => {
    const insCo = rates.filter(r => r.category === 'insurance').reduce((s, r) => s + r.companyRate, 0) + health.baseRate / 2 + pension.companyRate;
    const insEm = rates.filter(r => r.category === 'insurance').reduce((s, r) => s + r.employeeRate, 0) + health.baseRate / 2 + pension.employeeRate;
    return { insCo, insEm, total: rates.length + 3, changes: changeLog.length };
  }, [rates, health, pension, changeLog]);

  return (
    <>
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-green-600 text-lg">&#10003;</span>
          <span className="text-sm font-medium text-green-800">{t('salaryTable.savedSuccess')}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('salaryTable.companyInsTotal'), value: `${stats.insCo.toFixed(2)}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('salaryTable.employeeInsTotal'), value: `${stats.insEm.toFixed(2)}%`, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: t('salaryTable.configItems'), value: `${stats.total} ${t('salaryTable.itemUnit')}`, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: t('salaryTable.changeHistory'), value: `${stats.changes} ${t('payroll.degreeSuffix') || ''}`, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Three main insurance/tax sections */}
      <div className="space-y-6 mt-6">
        <HealthInsuranceSection settings={health} onChange={setHealth} changeLog={changeLog} setChangeLog={setChangeLog} />
        <PensionSection settings={pension} onChange={setPension} changeLog={changeLog} setChangeLog={setChangeLog} />
        <IncomeTaxSection brackets={taxBrackets} onChange={setTaxBrackets} changeLog={changeLog} setChangeLog={setChangeLog} />
      </div>

      {/* Category Filter + Change Log toggle */}
      <div className="flex gap-2 flex-wrap mt-6">
        <button onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t('payroll.filterClear')}</button>
        {['insurance', 'tax', 'allowance'].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t('salaryTable.' + cat)}</button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setShowLog(!showLog)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showLog ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}>{t('salaryTable.changeHistory')} ({changeLog.length})</button>
      </div>

      {/* Other Rates Table */}
      <div className="mt-6">
        <Card title={t('salaryTable.otherRatesTitle')}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('salaryTable.itemName')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('salaryTable.itemType')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-blue-600 uppercase">{t('salaryTable.companyRate')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-orange-600 uppercase">{t('salaryTable.employeeRate')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-blue-600 uppercase">{t('salaryTable.companyFixed')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-orange-600 uppercase">{t('salaryTable.employeeFixed')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('salaryTable.memo')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('paymentMethods.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => {
                  const trans = getItemTranslation(item.id, item.name, item.description, t);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{trans.name}</p>
                        {locale === 'ja' && <p className="text-xs text-slate-400">{item.nameKana}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs rounded ${categoryColor(item.category)}`}>
                          {t('salaryTable.' + item.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">{item.companyRate > 0 ? `${item.companyRate}%` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">{item.employeeRate > 0 ? `${item.employeeRate}%` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-right text-blue-600">{item.companyFixed > 0 ? `¥${item.companyFixed.toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600">{item.employeeFixed > 0 ? `¥${item.employeeFixed.toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">{trans.desc}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setEditingItem(item)} className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">{t('salaryTable.editBtn')}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Summary */}
      <div className="mt-6">
        <Card title={t('salaryTable.summaryTitle')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-blue-800 mb-3">{t('salaryTable.companyBurden')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>{t('salaryTable.healthTitle')}</span><span className="font-medium">{(health.baseRate / 2).toFixed(2)}%</span></div>
                <div className="flex justify-between>"><span>{t('salaryTable.pensionTitle')}</span><span className="font-medium">{pension.companyRate}%</span></div>
                {rates.filter(r => r.companyRate > 0).map(r => {
                  const trans = getItemTranslation(r.id, r.name, r.description, t);
                  return (
                    <div key={r.id} className="flex justify-between"><span>{trans.name}</span><span className="font-medium">{r.companyRate}%</span></div>
                  );
                })}
                {rates.filter(r => r.companyFixed > 0).map(r => {
                  const trans = getItemTranslation(r.id, r.name, r.description, t);
                  return (
                    <div key={r.id} className="flex justify-between"><span>{trans.name}</span><span className="font-medium">¥{r.companyFixed.toLocaleString()}</span></div>
                  );
                })}
              </div>
            </div>
            <div className="bg-orange-50 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-orange-800 mb-3">{t('salaryTable.employeeBurden')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>{t('salaryTable.healthTitle')}</span><span className="font-medium">{(health.baseRate / 2).toFixed(2)}%</span></div>
                <div className="flex justify-between"><span>{t('salaryTable.pensionTitle')}</span><span className="font-medium">{pension.employeeRate}%</span></div>
                {rates.filter(r => r.employeeRate > 0).map(r => {
                  const trans = getItemTranslation(r.id, r.name, r.description, t);
                  return (
                    <div key={r.id} className="flex justify-between"><span>{trans.name}</span><span className="font-medium">{r.employeeRate}%</span></div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Change Log */}
      {showLog && (
        <div className="mt-6">
          <Card title={t('salaryTable.changeHistoryTitle')}>
            {changeLog.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">{t('salaryTable.noChangeHistory')}</p>
            ) : (
              <div className="space-y-3">
                {changeLog.map(log => (
                  <div key={log.id} className="flex gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-800">{log.itemName}</span>
                        <span className="text-xs text-slate-400">-</span>
                        <span className="text-xs text-slate-500">{log.field}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-500 line-through">{log.oldValue}</span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="text-green-600 font-medium">{log.newValue}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{t('salaryTable.historyReason')}: {log.reason}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-400">{log.timestamp}</span>
                        <span className="text-xs text-slate-400">|</span>
                        <span className="text-xs text-slate-400">{log.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {editingItem && <EditModal item={editingItem} onSave={handleSaveRate} onClose={() => setEditingItem(null)} />}
    </>
  );
}
