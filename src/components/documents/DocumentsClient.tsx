'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';

interface Employee {
  id: string; firstName: string; lastName: string; firstNameKana: string;
  department: string; position: string; salary: number; salaryType: string;
  joinDate?: string; birthDate?: string; address?: string;
}

interface DocRecord {
  id: string;
  employeeId: string;
  type: string;
  issuedDate: string;
  purpose: string;
  status: 'issued' | 'pending';
}

const docTypes = [
  { value: 'income', icon: '💰' },
  { value: 'employment', icon: '🏢' },
  { value: 'resignation', icon: '📄' },
  { value: 'withholding', icon: '🧾' },
  { value: 'contract', icon: '📋' },
  { value: 'id_cert', icon: '🪪' },
  { value: 'salary_cert', icon: '💵' },
  { value: 'attendance_cert', icon: '🕐' },
];

const getDocTypeLabel = (type: string, t: any) => {
  switch (type) {
    case 'income': return t('documents.typeIncome');
    case 'employment': return t('documents.typeEmployment');
    case 'resignation': return t('documents.typeResignation');
    case 'withholding': return t('documents.typeWithholding');
    case 'contract': return t('documents.typeContract');
    case 'id_cert': return t('documents.typeIdCert');
    case 'salary_cert': return t('documents.typeSalaryCert');
    case 'attendance_cert': return t('documents.typeAttendanceCert');
    default: return type;
  }
};

const getDepartmentLabel = (dept: string, t: any) => {
  const isVi = t('documents.cancelBtn').includes('Hủy');
  const isEn = t('documents.cancelBtn').includes('Cancel');
  const isZh = t('documents.cancelBtn').includes('取消');
  const isTh = t('documents.cancelBtn').includes('ยกเลิก');
  if (dept === '開発部') return isVi ? 'Bộ phận phát triển' : isEn ? 'Development' : isZh ? '研发部' : isTh ? 'ฝ่ายพัฒนา' : '開発部';
  if (dept === '営業部') return isVi ? 'Bộ phận kinh doanh' : isEn ? 'Sales' : isZh ? '销售部' : isTh ? 'ฝ่ายขาย' : '営業部';
  if (dept === '経理部') return isVi ? 'Bộ phận kế toán' : isEn ? 'Accounting' : isZh ? '财务部' : isTh ? 'ฝ่ายบัญชี' : '経理部';
  if (dept === '人事部') return isVi ? 'Bộ phận nhân sự' : isEn ? 'HR' : isZh ? '人事部' : isTh ? 'ฝ่ายบุคคล' : '人事部';
  return dept;
};

const getPurposeLabel = (purp: string, t: any) => {
  if (purp === '本人用') return t('documents.purposeDefault');
  return purp;
};

export default function DocumentsClient({ employees }: { employees: Employee[] }) {
  const { t, locale } = useI18n();
  const [records, setRecords] = useState<DocRecord[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [purpose, setPurpose] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!selectedEmp || !selectedType) return;
    const newRecord: DocRecord = {
      id: `doc-${Date.now()}`,
      employeeId: selectedEmp,
      type: selectedType,
      issuedDate: new Date().toISOString().split('T')[0],
      purpose: purpose || t('documents.purposeDefault'),
      status: 'issued',
    };
    setRecords(prev => [newRecord, ...prev]);
    setGenerating(newRecord.id);
    setTimeout(() => setGenerating(null), 2000);
    setShowGenerate(false);
    setSelectedEmp('');
    setSelectedType('');
    setPurpose('');
  };

  const filtered = useMemo(() => {
    return records.filter(r => {
      const emp = employees.find(e => e.id === r.employeeId);
      const name = emp ? `${emp.lastName} ${emp.firstName}` : '';
      const matchSearch = search === '' || name.toLowerCase().includes(search.toLowerCase()) || r.purpose.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === '' || r.type === filterType;
      return matchSearch && matchType;
    });
  }, [records, employees, search, filterType]);

  const stats = useMemo(() => {
    const total = records.length;
    const thisMonth = records.filter(r => {
      const now = new Date();
      const d = new Date(r.issuedDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const byType = docTypes.map(tItem => ({
      ...tItem,
      count: records.filter(r => r.type === tItem.value).length,
    })).filter(tItem => tItem.count > 0);
    return { total, thisMonth, byType };
  }, [records]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('documents.statsTotal'), value: t('payroll.daysLeft').replace('{days}', String(stats.total)).replace('days remaining', 'documents').replace('あと', '').replace('日', '件'), color: 'text-blue-600', bg: 'bg-blue-50/40 border-blue-100 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.06)]' },
          { label: t('documents.statsMonth'), value: t('payroll.daysLeft').replace('{days}', String(stats.thisMonth)).replace('days remaining', 'documents').replace('あと', '').replace('日', '件'), color: 'text-green-600', bg: 'bg-green-50/40 border-green-100 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.06)]' },
          { label: t('documents.statsTypes'), value: t('payroll.daysLeft').replace('{days}', String(stats.byType.length)).replace('days remaining', 'types').replace('あと', '').replace('日', '種'), color: 'text-purple-600', bg: 'bg-purple-50/40 border-purple-100 shadow-[0_4px_20px_-4px_rgba(147,51,234,0.06)]' },
          { label: t('documents.statsEmployees'), value: t('payroll.daysLeft').replace('{days}', String(new Set(records.map(r => r.employeeId)).size)).replace('days remaining', 'staff').replace('あと', '').replace('日', '名'), color: 'text-orange-600', bg: 'bg-orange-50/40 border-orange-100 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.06)]' },
        ].map((s, idx) => (
          <div key={idx} className={`${s.bg} rounded-2xl p-4.5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-default`}>
            <p className="text-xs text-slate-500 font-semibold mb-1">{s.label}</p>
            <p className={`text-2xl font-black mt-1 tracking-tight ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Generate Button */}
      <div className="flex justify-end">
        <button onClick={() => setShowGenerate(true)}
          className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer hover:scale-[1.01] active:scale-95">
          {t('documents.generateBtn')}
        </button>
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowGenerate(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="p-6.5">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">{t('documents.modalTitle')}</h3>
                <button onClick={() => setShowGenerate(false)} className="text-slate-400 hover:text-slate-650 text-xl font-bold border border-transparent rounded-lg hover:bg-slate-50 p-1 transition-all cursor-pointer">&times;</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('documents.labelEmployee')}</label>
                  <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                    <option value="">{t('documents.selectEmployee')}</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.lastName} {e.firstName} ({getDepartmentLabel(e.department, t)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">{t('documents.labelType')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {docTypes.map(tItem => (
                      <button key={tItem.value} onClick={() => setSelectedType(tItem.value)}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-300 flex items-center gap-2 ${selectedType === tItem.value ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/10 shadow-sm' : 'border-slate-200/80 bg-white hover:border-slate-350 hover:shadow-sm'}`}>
                        <span className="text-lg">{tItem.icon}</span>
                        <span className="text-xs font-bold text-slate-700">{getDocTypeLabel(tItem.value, t)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('documents.labelPurpose')}</label>
                  <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('documents.placeholderPurpose')} />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4 mt-6">
                <button onClick={() => setShowGenerate(false)} className="px-4 py-2.5 border border-slate-250 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer">{t('documents.cancelBtn')}</button>
                <button onClick={handleGenerate} disabled={!selectedEmp || !selectedType}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">{t('documents.submitBtn')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Types Overview */}
      <Card title={t('documents.cardTypes')} className="animate-fadeIn">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4.5">
          {docTypes.map(tItem => (
            <div key={tItem.value} className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4.5 text-center hover:bg-slate-100/55 hover:shadow-sm transition-all duration-300 cursor-pointer"
              onClick={() => { setFilterType(filterType === tItem.value ? '' : tItem.value); }}>
              <span className="text-2xl block mb-2">{tItem.icon}</span>
              <p className="text-xs font-bold text-slate-700 tracking-wide line-clamp-1">{getDocTypeLabel(tItem.value, t)}</p>
              <p className="text-[10px] text-slate-400 font-extrabold mt-1">{records.filter(r => r.type === tItem.value).length} {locale === 'ja' ? '件' : 'docs'}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Records Table */}
      <Card title={t('documents.cardHistory')} className="">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder={t('documents.searchPrompt')} value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-350 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3.5 py-2.5 border border-slate-350 bg-white rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all">
            <option value="">{t('documents.allDocuments')}</option>
            {docTypes.map(tItem => <option key={tItem.value} value={tItem.value}>{getDocTypeLabel(tItem.value, t)}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/60">
          <table className="w-full table-fixed text-sm border-collapse" style={{ minWidth: '900px' }}>
            <colgroup>
              <col style={{ width: '220px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '80px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 font-extrabold uppercase tracking-wider">
                <th className="px-5 py-3.5">{t('documents.colDocName')}</th>
                <th className="px-5 py-3.5">{t('documents.colEmployee')}</th>
                <th className="px-5 py-3.5">{t('documents.colDept')}</th>
                <th className="px-5 py-3.5">{t('documents.colIssueDate')}</th>
                <th className="px-5 py-3.5">{t('documents.colPurpose')}</th>
                <th className="px-5 py-3.5 text-center">{t('documents.colStatus')}</th>
                <th className="px-5 py-3.5 text-center">{t('documents.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400 bg-slate-50/20">
                  {records.length === 0 ? t('documents.noHistory') : t('documents.noHistoryFiltered')}
                </td></tr>
              ) : filtered.map(r => {
                const emp = employees.find(e => e.id === r.employeeId);
                const dt = docTypes.find(tItem => tItem.value === r.type);
                return (
                  <tr key={r.id} className={`hover:bg-slate-50/40 transition-colors ${generating === r.id ? 'bg-green-50/70' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{dt?.icon}</span>
                        <span className="text-xs font-bold text-slate-800">{dt ? getDocTypeLabel(dt.value, t) : ''}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-slate-700">{emp ? `${emp.lastName} ${emp.firstName}` : ''}</td>
                    <td className="px-5 py-4"><span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-lg font-bold border border-slate-200">{emp ? getDepartmentLabel(emp.department, t) : ''}</span></td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-500">{r.issuedDate}</td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-500 max-w-xs truncate" title={r.purpose}>{getPurposeLabel(r.purpose, t)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black rounded-lg border ${r.status === 'issued' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-750 border-yellow-200'}`}>
                        {r.status === 'issued' ? t('documents.statusIssued') : t('documents.statusProcessing')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button className="px-2.5 py-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg transition-colors cursor-pointer">PDF</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
