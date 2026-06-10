'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';
import ExportButtons from '@/components/common/ExportButtons';


interface Employee {
  id: string; firstName: string; lastName: string; department: string; position: string;
  salary: number; salaryType: string; joinDate?: string; age?: number;
}

const getDepartmentLabel = (dept: string, t: any) => {
  const isVi = t('reports.title').includes('Báo cáo');
  const isEn = t('reports.title').includes('Reports');
  const isZh = t('reports.title').includes('分析报表');
  const isTh = t('reports.title').includes('รายงาน');
  if (dept === '開発部') return isVi ? 'Bộ phận phát triển' : isEn ? 'Development' : isZh ? '研发部' : isTh ? 'ฝ่ายพัฒนา' : '開発部';
  if (dept === '営業部') return isVi ? 'Bộ phận kinh doanh' : isEn ? 'Sales' : isZh ? '销售部' : isTh ? 'ฝ่ายขาย' : '営業部';
  if (dept === '経理部') return isVi ? 'Bộ phận kế toán' : isEn ? 'Accounting' : isZh ? '财务部' : isTh ? 'ฝ่ายบัญชี' : '経理部';
  if (dept === '人事部') return isVi ? 'Bộ phận nhân sự' : isEn ? 'HR' : isZh ? '人事部' : isTh ? 'ฝ่ายบุคคล' : '人事部';
  return dept;
};

const getPositionLabel = (pos: string, t: any) => {
  const isVi = t('reports.title').includes('Báo cáo');
  const isEn = t('reports.title').includes('Reports');
  const isZh = t('reports.title').includes('分析报表');
  const isTh = t('reports.title').includes('รายงาน');
  if (pos === '課長') return isVi ? 'Trưởng phòng' : isEn ? 'Manager' : isZh ? '课长' : isTh ? 'ผู้จัดการ' : '課長';
  if (pos === '部長') return isVi ? 'Trưởng bộ phận' : isEn ? 'Director' : isZh ? '部长' : isTh ? 'ผู้อำนวยการ' : '部長';
  if (pos === '一般') return isVi ? 'Nhân viên' : isEn ? 'Staff' : isZh ? '普通员工' : isTh ? 'พนักงานทั่วไป' : '一般';
  return pos;
};

const getReportTabLabel = (key: string, t: any) => {
  const isVi = t('reports.title').includes('Báo cáo');
  const isEn = t('reports.title').includes('Reports');
  const isZh = t('reports.title').includes('分析报表');
  const isTh = t('reports.title').includes('รายงาน');

  if (key === 'overview') return isVi ? 'Tổng quan nhân sự' : isEn ? 'HR Overview' : isZh ? '人事概要' : isTh ? 'ภาพรวมกำลังพล' : '人事概要';
  if (key === 'department') return isVi ? 'Phân tích phòng ban' : isEn ? 'Department Analytics' : isZh ? '部门分析' : isTh ? 'วิเคราะห์แผนก' : '部署分析';
  if (key === 'salary') return isVi ? 'Phân tích lương' : isEn ? 'Compensation Analytics' : isZh ? '薪资分析' : isTh ? 'วิเคราะห์เงินเดือน' : '給与分析';
  if (key === 'demographics') return isVi ? 'Cơ cấu nhân sự' : isEn ? 'Workforce Demographics' : isZh ? '人员结构比' : isTh ? 'สัดส่วนกำลังพล' : '人員構成';
  return key;
};

const getStatLabel = (key: string, t: any) => {
  const isVi = t('reports.title').includes('Báo cáo');
  const isEn = t('reports.title').includes('Reports');
  const isZh = t('reports.title').includes('分析报表');
  const isTh = t('reports.title').includes('รายงาน');

  if (key === 'totalEmployees') return t('reports.totalEmployees');
  if (key === 'totalSalary') return isVi ? 'Tổng quỹ lương' : isEn ? 'Total Payroll' : isZh ? '薪资总额' : isTh ? 'งบประมาณเงินเดือนรวม' : '給与合計';
  if (key === 'avgSalary') return t('reports.avgSalary');
  if (key === 'maxSalary') return isVi ? 'Lương cao nhất' : isEn ? 'Max Salary' : isZh ? '最高薪资' : isTh ? 'เงินเดือนสูงสุด' : '最高給与';
  if (key === 'minSalary') return isVi ? 'Lương thấp nhất' : isEn ? 'Min Salary' : isZh ? '最低薪资' : isTh ? 'เงินเดือนต่ำสุด' : '最低給与';
  return key;
};

const formatYen = (val: number, t: any) => {
  const isJa = t('reports.title').includes('分析');
  const isZh = t('reports.title').includes('分析报表');
  if (isJa || isZh) {
    return `¥${Math.round(val / 10000)}万`;
  }
  return `¥${val.toLocaleString()}`;
};

function BarChart({ data, maxVal }: { data: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div className="space-y-3.5">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 w-32 md:w-40 flex-shrink-0 text-right truncate" title={d.label}>{d.label}</span>
          <div className="flex-1 bg-slate-100 rounded-xl h-6 overflow-hidden border border-slate-200/40">
            <div className={`${d.color} h-6 rounded-xl flex items-center justify-end pr-2.5 transition-all duration-500`}
              style={{ width: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%` }}>
              <span className="text-[10px] font-black text-white">{d.value > 0 ? d.value.toLocaleString() : ''}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, locale }: { data: { label: string; value: number; color: string }[]; locale: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  
  const renderedCircles: React.ReactNode[] = [];
  let cumulative = 0;
  for (const d of data) {
    const pct = total > 0 ? (d.value / total) * 100 : 0;
    const dasharray = `${pct} ${100 - pct}`;
    const dashoffset = 100 - cumulative;
    cumulative += pct;
    renderedCircles.push(
      <circle key={d.label} cx="18" cy="18" r="15.9" fill="none" stroke={d.color.replace('bg-', '').replace('-500', '')}
        className={d.color} strokeWidth="3.5" strokeDasharray={dasharray} strokeDashoffset={dashoffset} />
    );
  }

  return (
    <div className="flex items-center gap-8">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          {renderedCircles}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-slate-800 leading-none">{total}</span>
          <span className="text-[9px] font-bold text-slate-400 mt-0.5">{locale === 'ja' ? '名' : locale === 'vi' ? 'người' : locale === 'zh' ? '人' : locale === 'th' ? 'คน' : 'staff'}</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${d.color}`} />
            <span className="text-xs font-bold text-slate-500">{d.label}</span>
            <span className="text-xs font-black text-slate-800">
              {d.value} {locale === 'ja' ? '名' : locale === 'vi' ? 'người' : locale === 'zh' ? '人' : locale === 'th' ? 'คน' : 'staff'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsClient({ employees }: { employees: Employee[] }) {
  const { t, locale } = useI18n();
  const [selectedReport, setSelectedReport] = useState('overview');

  const employeeExportData = useMemo(() => {
    return employees.map(e => ({
      name: `${e.lastName} ${e.firstName}`,
      department: getDepartmentLabel(e.department, t),
      position: getPositionLabel(e.position, t),
      salary: e.salary,
      salaryType: e.salaryType,
      joinDate: e.joinDate || '',
      age: e.age || '',
    }));
  }, [employees, t]);


  const reports = [
    { key: 'overview', icon: '📊' },
    { key: 'department', icon: '🏬' },
    { key: 'salary', icon: '💰' },
    { key: 'demographics', icon: '👥' },
  ];

  const stats = useMemo(() => {
    const total = employees.length;
    const totalSalary = employees.reduce((s, e) => s + e.salary, 0);
    const avgSalary = Math.round(totalSalary / total);
    const maxSalary = Math.max(...employees.map(e => e.salary));
    const minSalary = Math.min(...employees.map(e => e.salary));

    const byDept = [...new Set(employees.map(e => e.department))].map(dept => {
      const deptEmps = employees.filter(e => e.department === dept);
      return {
        department: dept,
        count: deptEmps.length,
        totalSalary: deptEmps.reduce((s, e) => s + e.salary, 0),
        avgSalary: Math.round(deptEmps.reduce((s, e) => s + e.salary, 0) / deptEmps.length),
      };
    });

    const byPosition = [...new Set(employees.map(e => e.position))].map(pos => ({
      position: pos,
      count: employees.filter(e => e.position === pos).length,
      avgSalary: Math.round(employees.filter(e => e.position === pos).reduce((s, e) => s + e.salary, 0) / employees.filter(e => e.position === pos).length),
    }));

    const salaryRanges = [
      { label: '~25万', min: 0, max: 250000 },
      { label: '25~30万', min: 250000, max: 300000 },
      { label: '30~35万', min: 300000, max: 350000 },
      { label: '35~40万', min: 350000, max: 400000 },
      { label: '40~45万', min: 400000, max: 450000 },
      { label: '45万~', min: 450000, max: Infinity },
    ].map(r => ({
      label: r.label,
      count: employees.filter(e => e.salary >= r.min && e.salary < r.max).length,
    }));

    return { total, totalSalary, avgSalary, maxSalary, minSalary, byDept, byPosition, salaryRanges };
  }, [employees]);

  const positionSalaryExportData = useMemo(() => {
    return stats.byPosition.map(pos => {
      const posEmps = employees.filter(e => e.position === pos.position);
      const maxSalary = posEmps.length > 0 ? Math.max(...posEmps.map(e => e.salary)) : 0;
      const minSalary = posEmps.length > 0 ? Math.min(...posEmps.map(e => e.salary)) : 0;
      return {
        position: getPositionLabel(pos.position, t),
        count: pos.count,
        avgSalary: pos.avgSalary,
        maxSalary,
        minSalary,
        totalSalary: pos.avgSalary * pos.count,
      };
    });
  }, [stats.byPosition, employees, t]);


  const deptColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
  const posColors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400', 'bg-pink-400'];

  const isVi = t('reports.title').includes('Báo cáo');
  const isEn = t('reports.title').includes('Reports');
  const isZh = t('reports.title').includes('分析报表');
  const isTh = t('reports.title').includes('รายงาน');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Report Navigation */}
      <div className="flex gap-2.5 flex-wrap">
        {reports.map(r => (
          <button key={r.key} onClick={() => setSelectedReport(r.key)}
            className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer border ${selectedReport === r.key ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            <span>{r.icon}</span>
            <span>{getReportTabLabel(r.key, t)}</span>
          </button>
        ))}
      </div>

      {/* Overview Report */}
      {selectedReport === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: getStatLabel('totalEmployees', t), value: `${stats.total} ${locale === 'ja' ? '名' : locale === 'vi' ? 'người' : locale === 'zh' ? '人' : locale === 'th' ? 'คน' : 'staff'}`, color: 'text-blue-600', bg: 'bg-blue-50/40 border-blue-100 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.06)]' },
              { label: getStatLabel('totalSalary', t), value: `¥${stats.totalSalary.toLocaleString()}`, color: 'text-purple-600', bg: 'bg-purple-50/40 border-purple-100 shadow-[0_4px_20px_-4px_rgba(147,51,234,0.06)]' },
              { label: getStatLabel('avgSalary', t), value: `¥${stats.avgSalary.toLocaleString()}`, color: 'text-green-600', bg: 'bg-green-50/40 border-green-100 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.06)]' },
              { label: getStatLabel('maxSalary', t), value: `¥${stats.maxSalary.toLocaleString()}`, color: 'text-orange-600', bg: 'bg-orange-50/40 border-orange-100 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.06)]' },
              { label: getStatLabel('minSalary', t), value: `¥${stats.minSalary.toLocaleString()}`, color: 'text-red-600', bg: 'bg-red-50/40 border-red-100 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.06)]' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4.5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-default`}>
                <p className="text-xs text-slate-500 font-semibold mb-1">{s.label}</p>
                <p className={`text-lg font-black mt-1 tracking-tight ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title={isVi ? 'Nhân sự theo bộ phận' : isEn ? 'Headcount by Department' : isZh ? '各部门人数' : isTh ? 'จำนวนคนแบ่งตามแผนก' : '部署別人数'} className="">
              <BarChart data={stats.byDept.map((d, i) => ({ label: getDepartmentLabel(d.department, t), value: d.count, color: deptColors[i % deptColors.length] }))}
                maxVal={Math.max(...stats.byDept.map(d => d.count))} />
            </Card>
            <Card title={isVi ? 'Nhân sự theo chức vụ' : isEn ? 'Headcount by Position' : isZh ? '各职位人数' : isTh ? 'จำนวนคนแบ่งตามตำแหน่ง' : '役職別人数'} className="">
              <BarChart data={stats.byPosition.map((d, i) => ({ label: getPositionLabel(d.position, t), value: d.count, color: posColors[i % posColors.length] }))}
                maxVal={Math.max(...stats.byPosition.map(d => d.count))} />
            </Card>
          </div>
        </>
      )}

      {/* Department Report */}
      {selectedReport === 'department' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.byDept.map((dept, i) => (
              <Card key={dept.department} title="" className="animate-fadeIn">
                <div className="p-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl ${deptColors[i % deptColors.length]} flex items-center justify-center text-white text-base font-black shadow-sm`}>
                      {dept.department.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">{getDepartmentLabel(dept.department, t)}</h3>
                      <p className="text-[10px] text-slate-450 font-bold">
                        {dept.count} {locale === 'ja' ? '名' : locale === 'vi' ? 'người' : locale === 'zh' ? '人' : locale === 'th' ? 'คน' : 'staff'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center shadow-xs">
                      <p className="text-[10px] text-slate-450 font-bold uppercase">{isVi ? 'Nhân sự' : isEn ? 'Headcount' : isZh ? '人数' : isTh ? 'จำนวนคน' : '人数'}</p>
                      <p className="text-base font-black text-slate-700 mt-0.5">{dept.count}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center shadow-xs">
                      <p className="text-[10px] text-slate-455 font-bold uppercase">{t('reports.avgSalary')}</p>
                      <p className="text-base font-black text-blue-600 mt-0.5">{formatYen(dept.avgSalary, t)}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center shadow-xs">
                      <p className="text-[10px] text-slate-455 font-bold uppercase">{isVi ? 'Tổng lương' : isEn ? 'Total Base' : isZh ? '薪资合计' : isTh ? 'รวมเงินเดือน' : '給与合計'}</p>
                      <p className="text-base font-black text-purple-600 mt-0.5">{formatYen(dept.totalSalary, t)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>{isVi ? 'Chi phí công ty chi trả (15.05%)' : isEn ? 'Company Contribution (15.05%)' : isZh ? '企业负担比 (15.05%)' : isTh ? 'สัดส่วนบริษัทสมทบ (15.05%)' : '会社負担 (15.05%)'}</span>
                      <span className="font-semibold text-slate-700">¥{Math.round(dept.totalSalary * 0.1505).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>{isVi ? 'Tổng chi phí nhân sự' : isEn ? 'Total Cost to Company' : isZh ? '总人工成本' : isTh ? 'ค่าใช้จ่ายกำลังพลรวม' : '総人件費'}</span>
                      <span className="text-slate-850 font-black">¥{Math.round(dept.totalSalary * 1.1505).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card title={isVi ? 'So sánh lương giữa các bộ phận' : isEn ? 'Salary Comparison by Department' : isZh ? '各部门平均薪资对比' : isTh ? 'เปรียบเทียบเงินเดือนเฉลี่ยแต่ละแผนก' : '部署別 給与比較'} className="animate-fadeIn">
            <BarChart data={stats.byDept.map((d, i) => ({ label: getDepartmentLabel(d.department, t), value: d.avgSalary, color: deptColors[i % deptColors.length] }))}
              maxVal={Math.max(...stats.byDept.map(d => d.avgSalary))} />
          </Card>
        </>
      )}

      {/* Salary Report */}
      {selectedReport === 'salary' && (
        <>
          <Card title={isVi ? 'Phân bổ mức lương' : isEn ? 'Salary Distribution' : isZh ? '薪资区间分布图' : isTh ? 'ช่วงการกระจายเงินเดือน' : '給与分布'} className="">
            <BarChart data={stats.salaryRanges.map((d, i) => ({
              label: d.label, value: d.count, color: ['bg-blue-400', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700', 'bg-blue-800', 'bg-blue-900'][i],
            }))} maxVal={Math.max(...stats.salaryRanges.map(d => d.count))} />
          </Card>
          <Card
            title={isVi ? 'Phân tích lương theo chức vụ' : isEn ? 'Salary Analytics by Position' : isZh ? '各职位薪资分析' : isTh ? 'วิเคราะห์เงินเดือนแบ่งตามตำแหน่ง' : '役職別 給与分析'}
            action={
              <ExportButtons
                data={positionSalaryExportData}
                columns={[
                  { header: isVi ? 'Chức vụ' : isEn ? 'Position' : isZh ? '职位' : isTh ? 'ตำแหน่ง' : '役職', key: 'position' },
                  { header: isVi ? 'Nhân sự' : isEn ? 'Headcount' : isZh ? '人数' : isTh ? 'จำนวนคน' : '人数', key: 'count' },
                  { header: t('reports.avgSalary') || 'Average Salary', key: 'avgSalary' },
                  { header: isVi ? 'Cao nhất' : isEn ? 'Max' : isZh ? '最高' : isTh ? 'สูงสุด' : '最高', key: 'maxSalary' },
                  { header: isVi ? 'Thấp nhất' : isEn ? 'Min' : isZh ? '最低' : isTh ? 'ต่ำสุด' : '最低', key: 'minSalary' },
                  { header: isVi ? 'Tổng cộng' : isEn ? 'Total' : isZh ? '薪资合计' : isTh ? 'รวมจ่าย' : '給与合計', key: 'totalSalary' },
                ]}
                fileName="salary_by_position"
              />
            }
            className=""
          >
            <div className="overflow-x-auto rounded-xl border border-slate-200/60">
              <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: '750px' }}>
                <colgroup>
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '150px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="px-5 py-3.5">{isVi ? 'Chức vụ' : isEn ? 'Position' : isZh ? '职位' : isTh ? 'ตำแหน่ง' : '役職'}</th>
                    <th className="px-5 py-3.5 text-center">{isVi ? 'Nhân sự' : isEn ? 'Headcount' : isZh ? '人数' : isTh ? 'จำนวนคน' : '人数'}</th>
                    <th className="px-5 py-3.5 text-right">{t('reports.avgSalary')}</th>
                    <th className="px-5 py-3.5 text-right">{isVi ? 'Cao nhất' : isEn ? 'Max' : isZh ? '最高' : isTh ? 'สูงสุด' : '最高'}</th>
                    <th className="px-5 py-3.5 text-right">{isVi ? 'Thấp nhất' : isEn ? 'Min' : isZh ? '最低' : isTh ? 'ต่ำสุด' : '最低'}</th>
                    <th className="px-5 py-3.5 text-right">{isVi ? 'Tổng cộng' : isEn ? 'Total' : isZh ? '薪资合计' : isTh ? 'รวมจ่าย' : '給与合計'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.byPosition.map(pos => {
                    const posEmps = employees.filter(e => e.position === pos.position);
                    return (
                      <tr key={pos.position} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-4 text-xs font-bold text-slate-800">{getPositionLabel(pos.position, t)}</td>
                        <td className="px-5 py-4 text-center text-xs font-bold text-slate-500">
                          {pos.count} {locale === 'ja' ? '名' : locale === 'vi' ? 'người' : locale === 'zh' ? '人' : locale === 'th' ? 'คน' : 'staff'}
                        </td>
                        <td className="px-5 py-4 text-right text-xs font-bold text-blue-600">¥{pos.avgSalary.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right text-xs font-bold text-green-600">¥{Math.max(...posEmps.map(e => e.salary)).toLocaleString()}</td>
                        <td className="px-5 py-4 text-right text-xs font-bold text-red-655">¥{Math.min(...posEmps.map(e => e.salary)).toLocaleString()}</td>
                        <td className="px-5 py-4 text-right text-xs font-black text-slate-800">¥{(pos.avgSalary * pos.count).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={isVi ? 'Top 5 nhân viên lương cao nhất' : isEn ? 'Top 5 Salaries' : isZh ? '薪资排名前五 (TOP 5)' : isTh ? 'อันดับเงินเดือนสูงสุด 5 อันดับแรก' : '給与 TOP 5'} className="">
            <div className="space-y-3">
              {[...employees].sort((a, b) => b.salary - a.salary).slice(0, 5).map((e, i) => (
                <div key={e.id} className="flex items-center gap-3 p-3 bg-slate-50 border rounded-2xl hover:shadow-xs transition-all duration-350">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-xs ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{e.lastName} {e.firstName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{getDepartmentLabel(e.department, t)} | {getPositionLabel(e.position, t)}</p>
                  </div>
                  <span className="text-xs font-black text-blue-600 pr-1">¥{e.salary.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Demographics Report */}
      {selectedReport === 'demographics' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title={isVi ? 'Tỷ lệ nhân sự theo bộ phận' : isEn ? 'Department Composition' : isZh ? '各部门人员占比' : isTh ? 'สัดส่วนจำนวนคนแยกตามแผนก' : '部署別 構成比'} className="">
              <DonutChart data={stats.byDept.map((d, i) => ({
                label: getDepartmentLabel(d.department, t), value: d.count, color: deptColors[i % deptColors.length],
              }))} locale={locale} />
            </Card>

            <Card title={isVi ? 'Tỷ lệ nhân sự theo chức vụ' : isEn ? 'Position Composition' : isZh ? '各职位人员占比' : isTh ? 'สัดส่วนจำนวนคนแยกตามตำแหน่ง' : '役職別 構成比'} className="">
              <DonutChart data={stats.byPosition.map((d, i) => ({
                label: getPositionLabel(d.position, t), value: d.count, color: posColors[i % posColors.length],
              }))} locale={locale} />
            </Card>
          </div>

          <Card title={isVi ? 'Tải xuống danh sách nhân viên' : isEn ? 'Download Employee List' : isZh ? '员工名册/数据导出' : isTh ? 'ดาวน์โหลดรายชื่อพนักงาน' : '従業員一覧 ダウンロード'} className="">
            <ExportButtons
              data={employeeExportData}
              columns={[
                { header: t('reports.colName') || 'Name', key: 'name' },
                { header: t('reports.colDept') || 'Department', key: 'department' },
                { header: t('reports.colPos') || 'Position', key: 'position' },
                { header: t('reports.colSalary') || 'Salary', key: 'salary' },
                { header: t('reports.colSalaryType') || 'Salary Type', key: 'salaryType' },
                { header: t('reports.colJoinDate') || 'Join Date', key: 'joinDate' },
                { header: t('reports.colAge') || 'Age', key: 'age' },
              ]}
              fileName="employee_list_report"
            />
          </Card>
        </>
      )}
    </div>
  );
}
