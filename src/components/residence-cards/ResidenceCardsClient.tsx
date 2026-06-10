'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Card from '@/components/common/Card';
import EmployeeFormModal from '@/components/employees/EmployeeFormModal';
import { formatDate } from '@/lib/utils';
import type { Employee } from '@/types';
import { useI18n } from '@/lib/i18n';
import Portal from '@/components/common/Portal';
import ExportButtons from '@/components/common/ExportButtons';


type ExpiryLevel = 'expired' | 'expiring' | 'valid';

function getExpiryStatus(expiryDate: string, t: any): { level: ExpiryLevel; daysLeft: number; label: string; colorClasses: string; pct: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      level: 'expired',
      daysLeft,
      label: t('residenceCards.residenceCardExpiredLabel').replace('{days}', String(Math.abs(daysLeft))),
      colorClasses: 'bg-red-50 text-red-700 border-red-200',
      pct: 0
    };
  }
  if (daysLeft <= 90) {
    return {
      level: 'expiring',
      daysLeft,
      label: t('residenceCards.residenceCardExpiringLabel').replace('{days}', String(daysLeft)),
      colorClasses: 'bg-amber-50 text-amber-700 border-amber-200',
      pct: Math.max(0, (daysLeft / 90) * 100)
    };
  }
  return {
    level: 'valid',
    daysLeft,
    label: t('residenceCards.residenceCardValidLabel'),
    colorClasses: 'bg-green-50 text-green-700 border-green-200',
    pct: 100
  };
}

const getNationalityLabel = (nationality: string, t: any) => {
  const isVi = t('residenceCards.updateBtn').includes('Cập nhật');
  const isEn = t('residenceCards.updateBtn').includes('Renew');
  const isZh = t('residenceCards.updateBtn').includes('更新');
  const isTh = t('residenceCards.updateBtn').includes('อัปเดต');

  if (nationality === 'ベトナム' || nationality === 'Vietnam') {
    return isVi ? 'Việt Nam' : isEn ? 'Vietnam' : isZh ? '越南' : isTh ? 'เวียดนาม' : 'ベトナム';
  }
  if (nationality === '中国' || nationality === 'China') {
    return isVi ? 'Trung Quốc' : isEn ? 'China' : isZh ? '中国' : isTh ? 'จีน' : '中国';
  }
  if (nationality === 'タイ' || nationality === 'Thailand') {
    return isVi ? 'Thái Lan' : isEn ? 'Thailand' : isZh ? '泰国' : isTh ? 'ไทย' : 'タイ';
  }
  if (nationality === 'ネパール' || nationality === 'Nepal') {
    return isVi ? 'Nepal' : isEn ? 'Nepal' : isZh ? '尼泊尔' : isTh ? 'เนปาล' : 'ネパール';
  }
  if (nationality === 'ミャンマー' || nationality === 'Myanmar') {
    return isVi ? 'Myanmar' : isEn ? 'Myanmar' : isZh ? '缅甸' : isTh ? 'เมียนมา' : 'ミャンマー';
  }
  if (nationality === 'インドネシア' || nationality === 'Indonesia') {
    return isVi ? 'Indonesia' : isEn ? 'Indonesia' : isZh ? '印尼' : isTh ? 'อินโดนีเซีย' : 'インドネシア';
  }
  if (nationality === 'フィリピン' || nationality === 'Philippines') {
    return isVi ? 'Philippines' : isEn ? 'Philippines' : isZh ? '菲律宾' : isTh ? 'ฟิลิปปินส์' : 'フィリピン';
  }
  if (nationality === '日本' || nationality === 'Japan') {
    return isVi ? 'Nhật Bản' : isEn ? 'Japan' : isZh ? '日本' : isTh ? 'ญี่ปุ่น' : '日本';
  }
  return nationality;
};

const getVisaStatusLabel = (status: string, t: any) => {
  const isVi = t('residenceCards.updateBtn').includes('Cập nhật');
  const isEn = t('residenceCards.updateBtn').includes('Renew');
  const isZh = t('residenceCards.updateBtn').includes('更新');
  const isTh = t('residenceCards.updateBtn').includes('อัปเดต');

  if (status === '技術・人文知識・国際業務') {
    return isVi ? 'Kỹ thuật/Nhân văn/Quốc tế' : isEn ? 'Engineer/Humanities/Intl Services' : isZh ? '技术·人文知识·国际业务' : isTh ? 'วิศวกร/มนุษยศาสตร์/บริการระหว่างประเทศ' : '技術・人文知識・国際業務';
  }
  if (status === '特定技能') {
    return isVi ? 'Kỹ năng đặc định' : isEn ? 'Specified Skilled Worker' : isZh ? '特定技能' : isTh ? 'ทักษะเฉพาะทาง' : '特定技能';
  }
  if (status === '家族滞在') {
    return isVi ? 'Đoàn tụ gia đình' : isEn ? 'Dependent' : isZh ? '家族滞在' : isTh ? 'ผู้พำนักอาศัยครอบครัว' : '家族滞在';
  }
  if (status === '留学') {
    return isVi ? 'Du học' : isEn ? 'Student' : isZh ? '留学' : isTh ? 'นักเรียน' : '留学';
  }
  if (status === '永住者') {
    return isVi ? 'Vĩnh trú' : isEn ? 'Permanent Resident' : isZh ? '永住者' : isTh ? 'ผู้พำนักถาวร' : '永住者';
  }
  if (status === '定住者') {
    return isVi ? 'Định cư' : isEn ? 'Long-term Resident' : isZh ? '定住者' : isTh ? 'ผู้ตั้งถิ่นฐาน' : '定住者';
  }
  if (status === '日本人の配偶者等') {
    return isVi ? 'Vợ/chồng người Nhật' : isEn ? 'Spouse of Japanese National' : isZh ? '日本配偶者' : isTh ? 'คู่สมรส củaคนญี่ปุ่น' : '日本人の配偶者等';
  }
  if (status === '特定活動') {
    return isVi ? 'Hoạt động đặc biệt' : isEn ? 'Designated Activities' : isZh ? '特定活动' : isTh ? 'กิจกรรมเฉพาะ' : '特定活動';
  }
  return status;
};

export default function ResidenceCardsClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const { t, locale: _locale } = useI18n();
  const [employees, _setEmployees] = useState<Employee[]>(initialEmployees);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ExpiryLevel>('ALL');
  const [nationalityFilter, setNationalityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'expiry' | 'name' | 'nationality'>('expiry');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedHistoryEmployee, setSelectedHistoryEmployee] = useState<Employee | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Filter foreign employees only
  const foreignEmployees = useMemo(() => {
    return employees.filter(emp => emp.nationality && emp.nationality !== '日本' && emp.residenceExpiry);
  }, [employees]);

  // Apply filters and sort
  const filteredEmployees = useMemo(() => {
    let result = [...foreignEmployees];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(emp =>
        `${emp.lastName}${emp.firstName}`.toLowerCase().includes(term) ||
        emp.employeeCode.toLowerCase().includes(term) ||
        (emp.residenceCardNumber || '').toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(emp => {
        if (!emp.residenceExpiry) return false;
        const status = getExpiryStatus(emp.residenceExpiry, t);
        return status.level === statusFilter;
      });
    }

    // Nationality filter
    if (nationalityFilter !== 'ALL') {
      result = result.filter(emp => emp.nationality === nationalityFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'expiry') {
        const dateA = a.residenceExpiry ? new Date(a.residenceExpiry).getTime() : Infinity;
        const dateB = b.residenceExpiry ? new Date(b.residenceExpiry).getTime() : Infinity;
        return dateA - dateB; // Soonest expiry first
      } else if (sortBy === 'name') {
        return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'ja');
      } else {
        return (a.nationality || '').localeCompare(b.nationality || '', 'ja');
      }
    });

    return result;
  }, [foreignEmployees, searchTerm, statusFilter, nationalityFilter, sortBy, t]);

  // Calculate stats
  const stats = useMemo(() => {
    const expired = foreignEmployees.filter(e => e.residenceExpiry && getExpiryStatus(e.residenceExpiry, t).level === 'expired').length;
    const expiring = foreignEmployees.filter(e => e.residenceExpiry && getExpiryStatus(e.residenceExpiry, t).level === 'expiring').length;
    const valid = foreignEmployees.filter(e => e.residenceExpiry && getExpiryStatus(e.residenceExpiry, t).level === 'valid').length;
    return { total: foreignEmployees.length, expired, expiring, valid };
  }, [foreignEmployees, t]);

  // Get unique nationalities
  const nationalities = useMemo(() => {
    const set = new Set(foreignEmployees.map(e => e.nationality).filter(Boolean));
    return Array.from(set).sort();
  }, [foreignEmployees]);

  const exportData = useMemo(() => {
    return filteredEmployees.map(emp => {
      const expiryStatus = emp.residenceExpiry ? getExpiryStatus(emp.residenceExpiry, t) : null;
      return {
        code: emp.employeeCode,
        name: `${emp.lastName} ${emp.firstName}`,
        nationality: emp.nationality ? getNationalityLabel(emp.nationality, t) : '',
        visa: emp.residenceStatus ? getVisaStatusLabel(emp.residenceStatus, t) : '',
        cardNo: emp.residenceCardNumber || '',
        expiry: emp.residenceExpiry ? formatDate(emp.residenceExpiry) : '',
        status: expiryStatus ? expiryStatus.label : '',
      };
    });
  }, [filteredEmployees, t]);

  const handleUpdate = (emp: Employee) => {
    setEditingEmployee(emp);
    setModalOpen(true);
  };

  const [_loading, setLoading] = useState(false);

  const handleSave = async (data: Omit<Employee, 'id'>, id?: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || t('residenceCards.updateError'));
      }
      window.location.reload();
    } catch (err: any) {
      console.error('Save failed:', err);
      alert(err.message || t('residenceCards.updateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats Overview - Premium Glassmorphism */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('residenceCards.statsTotal'), value: `${stats.total} ${t('residenceCards.totalCount')}`, color: 'text-slate-800', bg: 'bg-white border-slate-200/60 shadow-sm' },
          { label: t('residenceCards.statsExpired'), value: `${stats.expired} ${t('residenceCards.totalCount')}`, color: 'text-red-755 font-black', bg: 'bg-red-50/40 border-red-100 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.06)]' },
          { label: t('residenceCards.statsExpiring'), value: `${stats.expiring} ${t('residenceCards.totalCount')}`, color: 'text-orange-600 font-black', bg: 'bg-orange-50/40 border-orange-100 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.06)]' },
          { label: t('residenceCards.statsValid'), value: `${stats.valid} ${t('residenceCards.totalCount')}`, color: 'text-emerald-650 font-black', bg: 'bg-emerald-50/40 border-emerald-100 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.06)]' },
        ].map((s, idx) => (
          <div key={idx} className={`${s.bg} rounded-2xl p-4.5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-default`}>
            <p className="text-xs text-slate-550 font-semibold mb-1">{s.label}</p>
            <div className="flex items-baseline justify-between mt-1">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              {s.label.includes(t('residenceCards.statsExpired')) && parseInt(s.value.toString()) > 0 && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters - Redesigned to look premium */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t('residenceCards.searchPrompt')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-350 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3 py-2.5 border border-slate-350 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-semibold">
            <option value="ALL">{t('residenceCards.allStatuses')}</option>
            <option value="expired">{t('residenceCards.statusExpired')}</option>
            <option value="expiring">{t('residenceCards.statusExpiring')}</option>
            <option value="valid">{t('residenceCards.statusValidOnly')}</option>
          </select>
          <select value={nationalityFilter} onChange={e => setNationalityFilter(e.target.value)} className="px-3 py-2.5 border border-slate-350 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-semibold">
            <option value="ALL">{t('residenceCards.allNationalities')}</option>
            {nationalities.map(nat => (
              <option key={nat} value={nat}>{getNationalityLabel(nat, t)}</option>
            ))}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2.5 border border-slate-350 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-semibold">
            <option value="expiry">{t('residenceCards.sortExpiry')}</option>
            <option value="name">{t('residenceCards.sortName')}</option>
            <option value="nationality">{t('residenceCards.sortNationality')}</option>
          </select>
        </div>
      </Card>

      {/* Table - Spacious, elegant details */}
      <Card title={t('residenceCards.title') || 'Residence Cards'} action={
        <ExportButtons
          data={exportData}
          columns={[
            { header: t('residenceCards.colCode') || 'Code', key: 'code' },
            { header: t('residenceCards.colName') || 'Name', key: 'name' },
            { header: t('residenceCards.colNation') || 'Nationality', key: 'nationality' },
            { header: t('residenceCards.colVisa') || 'Visa Status', key: 'visa' },
            { header: t('residenceCards.colCardNo') || 'Card Number', key: 'cardNo' },
            { header: t('residenceCards.colExpiry') || 'Expiry Date', key: 'expiry' },
            { header: t('residenceCards.colTimeline') || 'Status', key: 'status' },
          ]}
          fileName="residence_cards_list"
        />
      } className="overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-slate-50/20">
            {t('residenceCards.noEmployees')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm border-collapse" style={{ minWidth: '1130px' }}>
              <colgroup>
                <col style={{ width: '100px' }} />
                <col style={{ width: '180px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '170px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-550 font-extrabold uppercase tracking-wider">
                  <th className="px-5 py-3.5 w-[100px] min-w-[100px]">{t('residenceCards.colCode')}</th>
                  <th className="px-5 py-3.5 w-[180px] min-w-[180px]">{t('residenceCards.colName')}</th>
                  <th className="px-5 py-3.5 w-[100px] min-w-[100px]">{t('residenceCards.colNation')}</th>
                  <th className="px-5 py-3.5 w-[160px] min-w-[160px]">{t('residenceCards.colVisa')}</th>
                  <th className="px-5 py-3.5 w-[150px] min-w-[150px]">{t('residenceCards.colCardNo')}</th>
                  <th className="px-5 py-3.5 w-[110px] min-w-[110px]">{t('residenceCards.colExpiry')}</th>
                  <th className="px-5 py-3.5 w-[170px] min-w-[170px]">{t('residenceCards.colTimeline')}</th>
                  <th className="px-5 py-3.5 text-right w-[160px] min-w-[160px]">{t('residenceCards.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map(emp => {
                  const expiryStatus = emp.residenceExpiry ? getExpiryStatus(emp.residenceExpiry, t) : null;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-blue-600 font-bold w-[100px] min-w-[100px] truncate">{emp.employeeCode}</td>
                      <td className="px-5 py-4 w-[180px] min-w-[180px]">
                        <div className="flex items-center gap-3 min-w-0">
                          {emp.avatar ? (
                            <Image src={emp.avatar} alt="" width={36} height={36} className="rounded-full object-cover border border-slate-200 shadow-sm" />
                          ) : (
                            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600 border border-slate-200">
                              {emp.firstNameKana?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-bold text-slate-800 truncate">{emp.lastName} {emp.firstName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 w-[100px] min-w-[100px] truncate">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-655 text-[11px] font-extrabold rounded-lg border border-slate-200/80 block truncate max-w-full text-center">
                          {emp.nationality ? getNationalityLabel(emp.nationality, t) : ''}
                        </span>
                      </td>
                      <td className="px-5 py-4 w-[160px] min-w-[160px] truncate">
                        <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200/60 text-blue-700 text-xs rounded-lg font-bold block truncate max-w-full text-center">
                          {emp.residenceStatus ? getVisaStatusLabel(emp.residenceStatus, t) : '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 w-[150px] min-w-[150px] truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-500 truncate">{emp.residenceCardNumber || '-'}</span>
                          {emp.residenceCardImage && (
                            <button
                              onClick={() => setPreviewImageUrl(emp.residenceCardImage)}
                              className="p-0.5 border border-slate-200 rounded hover:border-blue-400 bg-slate-50 transition-all cursor-pointer shrink-0"
                              title={t('residenceCards.previewCardImage')}
                            >
                              <Image src={emp.residenceCardImage} alt="card" width={24} height={16} className="object-cover rounded-xs" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-655 font-bold text-xs w-[110px] min-w-[110px] truncate">{emp.residenceExpiry ? formatDate(emp.residenceExpiry) : '-'}</td>
                      <td className="px-5 py-4 w-[170px] min-w-[170px]">
                        {expiryStatus && (
                          <div className="space-y-1 max-w-[150px]">
                            <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${expiryStatus.colorClasses} block truncate max-w-full text-center`}>
                              {expiryStatus.label}
                            </span>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  expiryStatus.level === 'expired' ? 'bg-red-500' :
                                  expiryStatus.level === 'expiring' ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${expiryStatus.pct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right w-[160px] min-w-[160px]">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setSelectedHistoryEmployee(emp)}
                            className="px-3.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                          >
                            {t('residenceCards.historyBtn')}
                          </button>
                          <button
                            onClick={() => handleUpdate(emp)}
                            className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                          >
                            {t('residenceCards.updateBtn')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Employee Form Modal */}
      <EmployeeFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEmployee(null); }}
        onSave={handleSave}
        employee={editingEmployee}
      />

      {/* Residence Card History Modal */}
      {selectedHistoryEmployee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl max-w-xl w-full border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all scale-100">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {selectedHistoryEmployee.lastName} {selectedHistoryEmployee.firstName}
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  {t('residenceCards.historyTitle')}
                </p>
              </div>
              <button
                onClick={() => setSelectedHistoryEmployee(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!selectedHistoryEmployee.residenceCardHistory || selectedHistoryEmployee.residenceCardHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  {t('residenceCards.noHistory')}
                </div>
              ) : (
                <div className="relative border-l border-blue-100 ml-3 pl-5 space-y-4 py-2">
                  {[...selectedHistoryEmployee.residenceCardHistory]
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .map((h, i, arr) => (
                      <div key={h.id} className="relative">
                        <span className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        </span>
                        <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 shadow-xs transition-colors">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              {t('client.historyNo').replace('{num}', String(arr.length - i))}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold font-mono">
                              {t('client.updateDateLabel')}: {formatDate(h.updatedAt)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600 mt-2">
                            <p>
                              {t('client.visaStatusLabel')}:{' '}
                              <strong className="text-slate-800">
                                {getVisaStatusLabel(h.residenceStatus, t)}
                              </strong>
                            </p>
                            <p>
                              {t('client.visaNoLabel')}:{' '}
                              <strong className="text-slate-800 font-mono">
                                {h.residenceCardNumber || '-'}
                              </strong>
                            </p>
                            <p>
                              {t('client.expiryDateLabel')}:{' '}
                              <strong className="text-slate-800 font-mono">
                                {h.residenceExpiry ? formatDate(h.residenceExpiry) : '-'}
                              </strong>
                            </p>
                            <p>
                              {t('client.restrictionLabel')}:{' '}
                              <strong className="text-slate-800">
                                {h.workRestriction || t('client.restrictionNone')}
                              </strong>
                            </p>
                          </div>
                          {h.residenceCardImage && (
                            <div className="mt-3 pt-2 border-t border-slate-100">
                              <p className="text-[10px] text-slate-400 font-bold mb-1">{t('residenceCards.colCardImage')}:</p>
                              <button
                                onClick={() => setPreviewImageUrl(h.residenceCardImage)}
                                className="p-0.5 border border-slate-200 rounded-lg hover:border-blue-400 bg-white transition-all max-w-[120px] block cursor-pointer"
                                title={t('residenceCards.previewCardImage')}
                              >
                                <Image src={h.residenceCardImage} alt="expired card" width={96} height={64} className="object-cover rounded" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedHistoryEmployee(null)}
                className="px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                {t('company.cancelBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
      {previewImageUrl && (
        <Portal>
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all"
            onClick={() => setPreviewImageUrl(null)}
          >
            <div 
              className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden p-2 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/75 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold cursor-pointer z-10 transition-colors"
              >
                &times;
              </button>
              <div className="relative w-full h-[80vh]">
                <Image src={previewImageUrl} alt="Residence Card Preview" fill className="rounded-lg object-contain" />
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
