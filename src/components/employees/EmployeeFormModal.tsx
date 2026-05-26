'use client';

import { useState, useEffect } from 'react';
import type { Employee, Dependent, Education, Certification, ResidenceCardHistory, Department, Position, ContractType } from '@/types';
import ManagementModal from '@/components/common/ManagementModal';
import Portal from '@/components/common/Portal';

interface EmployeeFormData {
  employeeCode: string;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  lastNameKana: string;
  email: string;
  phone: string;
  departmentId: string;
  positionId: string;
  hireDate: string;
  birthDate: string;
  avatar: string;
  salary: string;
  status: string;
  nationality: string;
  residenceStatus: string;
  residenceCardNumber: string;
  residenceCardIssueDate: string;
  residenceExpiry: string;
  workRestriction: string;
  contractTypeId: string;
  contractStartDate: string;
  contractEndDate: string;
  contractEndDateType: string;
  salaryType: string;
  hourlyRate: string;
  dailyRate: string;
  benefits: {
    healthInsurance: boolean;
    pension: boolean;
    employmentInsurance: boolean;
    workersComp: boolean;
    transportation: string;
    housing: string;
    meal: string;
  };
  dependentList: Dependent[];
  education: Education[];
  certifications: Certification[];
  residenceCardHistory: ResidenceCardHistory[];
}

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Employee, 'id'>, id?: string) => void;
  employee?: Employee | null;
}

const emptyForm: EmployeeFormData = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  firstNameKana: '',
  lastNameKana: '',
  email: '',
  phone: '',
  departmentId: '',
  positionId: '',
  hireDate: new Date().toISOString().split('T')[0],
  birthDate: '',
  avatar: '',
  salary: '',
  status: 'ACTIVE',
  nationality: '日本',
  residenceStatus: '',
  residenceCardNumber: '',
  residenceCardIssueDate: '',
  residenceExpiry: '',
  workRestriction: '',
  contractTypeId: '',
  contractStartDate: new Date().toISOString().split('T')[0],
  contractEndDate: '',
  contractEndDateType: 'none',
  salaryType: '月給',
  hourlyRate: '',
  dailyRate: '',
  benefits: { healthInsurance: false, pension: false, employmentInsurance: false, workersComp: false, transportation: '', housing: '', meal: '' },
  dependentList: [],
  education: [],
  certifications: [],
  residenceCardHistory: [],
};

const emptyDependent: Dependent = { name: '', relationship: '', birthDate: '', gender: '', cohabitation: '同居' };
const emptyEducation: Education = { school: '', degree: '', major: '', graduationYear: '' };
const emptyCertification: Certification = { name: '', issuer: '', acquiredDate: '', expiryDate: '' };

const residenceStatusOptions = [
  '技術・人文知識・国際業務',
  '技能',
  '高度専門職',
  '経営・管理',
  '技術',
  '教授',
  '芸術',
  '宗教',
  '報道',
  '法律・会計業務',
  '医療',
  '研究',
  '教育',
  '企業内転勤',
  '興行',
  '技能実習',
  '特定技能',
  '介護',
  '短期滞在',
  '留学',
  '研修',
  '家族滞在',
  '特定活動',
];

const toInputValue = (value: unknown) => value == null ? '' : String(value);
const toDateInputValue = (value: string | null | undefined) => value ? value.split('T')[0] : '';

export default function EmployeeFormModal({ isOpen, onClose, onSave, employee }: EmployeeFormModalProps) {
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [manageDeptOpen, setManageDeptOpen] = useState(false);
  const [managePosOpen, setManagePosOpen] = useState(false);
  const [manageContractOpen, setManageContractOpen] = useState(false);

  const isForeign = formData.nationality !== '日本';

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchPositions();
      fetchContractTypes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (employee) {
      const benefits = employee.benefits as any;
      setFormData({
        employeeCode: toInputValue(employee.employeeCode),
        firstName: toInputValue(employee.firstName),
        lastName: toInputValue(employee.lastName),
        firstNameKana: toInputValue(employee.firstNameKana),
        lastNameKana: toInputValue(employee.lastNameKana),
        email: toInputValue(employee.email),
        phone: toInputValue(employee.phone),
        departmentId: toInputValue(employee.departmentId),
        positionId: toInputValue(employee.positionId),
        hireDate: toDateInputValue(employee.hireDate),
        birthDate: toDateInputValue(employee.birthDate),
        avatar: toInputValue(employee.avatar),
        salary: toInputValue(employee.salary),
        status: toInputValue(employee.status) || 'ACTIVE',
        nationality: toInputValue(employee.nationality) || '日本',
        residenceStatus: toInputValue(employee.residenceStatus),
        residenceCardNumber: toInputValue(employee.residenceCardNumber),
        residenceCardIssueDate: toDateInputValue(employee.residenceCardIssueDate),
        residenceExpiry: toDateInputValue(employee.residenceExpiry),
        workRestriction: toInputValue(employee.workRestriction),
        contractTypeId: toInputValue(employee.contractTypeId),
        contractStartDate: toDateInputValue(employee.contractStartDate),
        contractEndDate: toDateInputValue(employee.contractEndDate),
        contractEndDateType: toInputValue(employee.contractEndDateType) || 'none',
        salaryType: toInputValue(employee.salaryType) || '月給',
        hourlyRate: employee.hourlyRate?.toString() || '',
        dailyRate: employee.dailyRate?.toString() || '',
        benefits: {
          healthInsurance: !!benefits?.healthInsurance,
          pension: !!benefits?.pension,
          employmentInsurance: !!benefits?.employmentInsurance,
          workersComp: !!benefits?.workersComp,
          transportation: toInputValue(benefits?.transportation),
          housing: toInputValue(benefits?.housing),
          meal: toInputValue(benefits?.meal),
        },
        dependentList: (employee.dependents || []).map(d => ({
          ...d,
          name: toInputValue(d.name),
          relationship: toInputValue(d.relationship),
          birthDate: toDateInputValue(d.birthDate),
          gender: toInputValue(d.gender),
          cohabitation: toInputValue(d.cohabitation) || '同居',
        })),
        education: (employee.education || []).map(e => ({
          ...e,
          school: toInputValue(e.school),
          degree: toInputValue(e.degree),
          major: toInputValue(e.major),
          graduationYear: toInputValue(e.graduationYear),
        })),
        certifications: (employee.certifications || []).map(c => ({
          ...c,
          name: toInputValue(c.name),
          issuer: toInputValue(c.issuer),
          acquiredDate: toDateInputValue(c.acquiredDate),
          expiryDate: toDateInputValue(c.expiryDate),
        })),
        residenceCardHistory: employee.residenceCardHistory || [],
      });
      setAutoGenerateCode(false);
    } else {
      setFormData(emptyForm);
      setAutoGenerateCode(true);
    }
  }, [employee, isOpen]);

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments');
    const data = await res.json();
    setDepartments(data);
  };

  const fetchPositions = async () => {
    const res = await fetch('/api/positions');
    const data = await res.json();
    setPositions(data);
  };

  const fetchContractTypes = async () => {
    const res = await fetch('/api/contract-types');
    const data = await res.json();
    setContractTypes(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'contractTypeId') {
        const selected = contractTypes.find(c => c.id === value);
        if (selected) {
          next.contractEndDateType = selected.defaultEndDateType;
          next.salaryType = selected.defaultSalaryType;
        }
      }
      if (name === 'contractEndDateType') {
        if (value === 'none') next.contractEndDate = '';
      }
      return next;
    });
  };

  const handleBenefitsChange = (field: string, value: boolean | string) => {
    setFormData(prev => ({
      ...prev,
      benefits: { ...prev.benefits, [field]: value },
    }));
  };

  const addDependent = () => {
    setFormData(prev => ({ ...prev, dependentList: [...prev.dependentList, { ...emptyDependent }] }));
  };

  const removeDependent = (index: number) => {
    setFormData(prev => ({ ...prev, dependentList: prev.dependentList.filter((_, i) => i !== index) }));
  };

  const updateDependent = (index: number, field: keyof Dependent, value: string) => {
    setFormData(prev => ({
      ...prev,
      dependentList: prev.dependentList.map((d, i) => i === index ? { ...d, [field]: value } : d),
    }));
  };

  const addEducation = () => {
    setFormData(prev => ({ ...prev, education: [...prev.education, { ...emptyEducation }] }));
  };

  const removeEducation = (index: number) => {
    setFormData(prev => ({ ...prev, education: prev.education.filter((_, i) => i !== index) }));
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((e, i) => i === index ? { ...e, [field]: value } : e),
    }));
  };

  const addCertification = () => {
    setFormData(prev => ({ ...prev, certifications: [...prev.certifications, { ...emptyCertification }] }));
  };

  const removeCertification = (index: number) => {
    setFormData(prev => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== index) }));
  };

  const updateCertification = (index: number, field: keyof Certification, value: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, avatar: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      {
        employeeCode: autoGenerateCode && !employee ? '' : formData.employeeCode,
        firstName: formData.firstName,
        lastName: formData.lastName,
        firstNameKana: formData.firstNameKana,
        lastNameKana: formData.lastNameKana,
        email: formData.email,
        phone: formData.phone,
        departmentId: formData.departmentId,
        positionId: formData.positionId,
        hireDate: formData.hireDate,
        birthDate: formData.birthDate || null,
        avatar: formData.avatar || null,
        salary: parseFloat(formData.salary) || 0,
        status: formData.status as any,
        nationality: formData.nationality,
        residenceStatus: isForeign ? formData.residenceStatus : null,
        residenceCardNumber: isForeign ? formData.residenceCardNumber : null,
        residenceCardIssueDate: isForeign ? formData.residenceCardIssueDate : null,
        residenceExpiry: isForeign ? formData.residenceExpiry : null,
        workRestriction: isForeign ? formData.workRestriction : null,
        contractTypeId: formData.contractTypeId,
        contractStartDate: formData.contractStartDate || null,
        contractEndDate: formData.contractEndDateType === 'fixed' ? (formData.contractEndDate || null) : null,
        contractEndDateType: formData.contractEndDateType,
        salaryType: formData.salaryType,
        hourlyRate: parseFloat(formData.hourlyRate) || 0,
        dailyRate: parseFloat(formData.dailyRate) || 0,
        benefits: {
          healthInsurance: formData.benefits.healthInsurance,
          pension: formData.benefits.pension,
          employmentInsurance: formData.benefits.employmentInsurance,
          workersComp: formData.benefits.workersComp,
          transportation: parseFloat(formData.benefits.transportation) || 0,
          housing: parseFloat(formData.benefits.housing) || 0,
          meal: parseFloat(formData.benefits.meal) || 0,
        },
        dependents: formData.dependentList,
        education: formData.education,
        certifications: formData.certifications,
        residenceCardHistory: formData.residenceCardHistory as any,
        createdAt: '',
        updatedAt: '',
      } as any,
      employee?.id,
    );
    onClose();
  };

  if (!isOpen) return null;

  const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-800">
            {employee ? '従業員情報を編集' : '新しい従業員を追加'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* アバター */}
          <section className="flex items-center gap-6">
            <div className="relative">
              {formData.avatar ? (
                <img src={formData.avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-500">
                  {formData.lastName?.charAt(0) || '?'}{formData.firstName?.charAt(0) || ''}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow-md">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>
            <div className="flex-1">
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={autoGenerateCode} onChange={e => setAutoGenerateCode(e.target.checked)} disabled={!!employee} className="rounded" />
                <span className="text-sm text-slate-600">従業員コードを自動生成</span>
              </label>
              {!autoGenerateCode && (
                <div><label className="block text-sm font-medium text-slate-700 mb-1">従業員コード</label><input type="text" name="employeeCode" value={formData.employeeCode} onChange={handleChange} placeholder="NV001" className={inputCls} required /></div>
              )}
            </div>
          </section>

          {/* 基本情報 */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">基本情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">姓</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="山田" className={inputCls} required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">名</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="太郎" className={inputCls} required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">セイ</label><input type="text" name="lastNameKana" value={formData.lastNameKana} onChange={handleChange} placeholder="ヤマダ" className={inputCls} required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">メイ</label><input type="text" name="firstNameKana" value={formData.firstNameKana} onChange={handleChange} placeholder="タロウ" className={inputCls} required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label><input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@company.jp" className={inputCls} required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="090-1234-5678" className={inputCls} required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">生年月日</label><input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className={inputCls} /></div>
            </div>
          </section>

          {/* 勤務情報 */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">勤務情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">部署</label>
                <div className="flex gap-2">
                  <select name="departmentId" value={formData.departmentId} onChange={handleChange} className={inputCls + ' flex-1'} required>
                    <option value="">部署を選択</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setManageDeptOpen(true)} className="px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap">管理</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">役職</label>
                <div className="flex gap-2">
                  <select name="positionId" value={formData.positionId} onChange={handleChange} className={inputCls + ' flex-1'} required>
                    <option value="">役職を選択</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setManagePosOpen(true)} className="px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap">管理</button>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">入社日</label><input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} className={inputCls} required /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">状態</label>
                <select name="status" value={formData.status} onChange={handleChange} className={inputCls} required>
                  <option value="ACTIVE">在籍中</option><option value="ON_LEAVE">休職中</option><option value="INACTIVE">退職</option>
                </select>
              </div>
            </div>
          </section>

          {/* 契約情報 */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">契約情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">雇用形態</label>
                <div className="flex gap-2">
                  <select name="contractTypeId" value={formData.contractTypeId} onChange={handleChange} className={inputCls + ' flex-1'} required>
                    <option value="">雇用形態を選択</option>
                    {contractTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setManageContractOpen(true)} className="px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap">管理</button>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">契約開始日</label><input type="date" name="contractStartDate" value={formData.contractStartDate} onChange={handleChange} className={inputCls} required /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">契約期間</label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="contractEndDateType" value="none" checked={formData.contractEndDateType === 'none'}
                      onChange={e => setFormData(prev => ({ ...prev, contractEndDateType: e.target.value, contractEndDate: '' }))}
                      className="text-blue-600" />
                    <span className="text-sm text-slate-700">無期限</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="contractEndDateType" value="fixed" checked={formData.contractEndDateType === 'fixed'}
                      onChange={e => setFormData(prev => ({ ...prev, contractEndDateType: e.target.value }))}
                      className="text-blue-600" />
                    <span className="text-sm text-slate-700">有期限</span>
                  </label>
                </div>
                {formData.contractEndDateType === 'fixed' && (
                  <input type="date" name="contractEndDate" value={formData.contractEndDate} onChange={handleChange} className={inputCls} />
                )}
              </div>
            </div>
          </section>

          {/* 給与形態・諸手当 */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">給与形態・諸手当</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">給与形態</label>
                <select name="salaryType" value={formData.salaryType} onChange={handleChange} className={inputCls} required>
                  <option value="月給">月給</option><option value="日給">日給</option><option value="時給">時給</option>
                </select>
              </div>
              {formData.salaryType === '月給' && (
                <div><label className="block text-sm font-medium text-slate-700 mb-1">基本給（円）</label><input type="number" name="salary" value={formData.salary} onChange={handleChange} placeholder="450000" className={inputCls} required /></div>
              )}
              {formData.salaryType === '日給' && (
                <div><label className="block text-sm font-medium text-slate-700 mb-1">日給単価（円）</label><input type="number" name="dailyRate" value={formData.dailyRate} onChange={handleChange} placeholder="12000" className={inputCls} required /></div>
              )}
              {formData.salaryType === '時給' && (
                <div><label className="block text-sm font-medium text-slate-700 mb-1">時給単価（円）</label><input type="number" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} placeholder="1500" className={inputCls} required /></div>
              )}
            </div>
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">社会保険</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.benefits.healthInsurance} onChange={e => handleBenefitsChange('healthInsurance', e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                  <span className="text-sm text-slate-700">健康保険</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.benefits.pension} onChange={e => handleBenefitsChange('pension', e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                  <span className="text-sm text-slate-700">厚生年金</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.benefits.employmentInsurance} onChange={e => handleBenefitsChange('employmentInsurance', e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                  <span className="text-sm text-slate-700">雇用保険</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.benefits.workersComp} onChange={e => handleBenefitsChange('workersComp', e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                  <span className="text-sm text-slate-700">労災保険</span>
                </label>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">諸手当（月額）</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">通勤手当</label><input type="number" value={formData.benefits.transportation} onChange={e => handleBenefitsChange('transportation', e.target.value)} placeholder="15000" className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">住宅手当</label><input type="number" value={formData.benefits.housing} onChange={e => handleBenefitsChange('housing', e.target.value)} placeholder="30000" className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">食事手当</label><input type="number" value={formData.benefits.meal} onChange={e => handleBenefitsChange('meal', e.target.value)} placeholder="10000" className={inputCls} /></div>
              </div>
            </div>
          </section>

          {/* 国籍・在留資格 */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">国籍・在留資格</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">国籍</label>
                <select name="nationality" value={formData.nationality} onChange={handleChange} className={inputCls}>
                  <option value="日本">日本</option><option value="中国">中国</option><option value="韓国">韓国</option><option value="北朝鮮">北朝鮮</option>
                  <option value="台湾">台湾</option><option value="香港">香港</option><option value="ベトナム">ベトナム</option><option value="ラオス">ラオス</option>
                  <option value="カンボジア">カンボジア</option><option value="タイ">タイ</option><option value="ミャンマー">ミャンマー</option>
                  <option value="マレーシア">マレーシア</option><option value="シンガポール">シンガポール</option><option value="インドネシア">インドネシア</option>
                  <option value="フィリピン">フィリピン</option><option value="ブルネイ">ブルネイ</option><option value="東ティモール">東ティモール</option>
                  <option value="インド">インド</option><option value="パキスタン">パキスタン</option><option value="バングラデシュ">バングラデシュ</option>
                  <option value="スリランカ">スリランカ</option><option value="ネパール">ネパール</option><option value="ブータン">ブータン</option>
                  <option value="モルディブ">モルディブ</option><option value="モンゴル">モンゴル</option><option value="カザフスタン">カザフスタン</option>
                  <option value="キルギス">キルギス</option><option value="タジキスタン">タジキスタン</option><option value="トルクメニスタン">トルクメニスタン</option>
                  <option value="ウズベキスタン">ウズベキスタン</option><option value="ロシア">ロシア</option><option value="ウクライナ">ウクライナ</option>
                  <option value="ベラルーシ">ベラルーシ</option><option value="モルドバ">モルドバ</option><option value="エストニア">エストニア</option>
                  <option value="ラトビア">ラトビア</option><option value="リトアニア">リトアニア</option><option value="ポーランド">ポーランド</option>
                  <option value="チェコ">チェコ</option><option value="スロバキア">スロバキア</option><option value="ハンガリー">ハンガリー</option>
                  <option value="ルーマニア">ルーマニア</option><option value="ブルガリア">ブルガリア</option><option value="アルバニア">アルバニア</option>
                  <option value="クロアチア">クロアチア</option><option value="ボスニア・ヘルツェゴビナ">ボスニア・ヘルツェゴビナ</option>
                  <option value="セルビア">セルビア</option><option value="モンテネグロ">モンテネグロ</option><option value="北マケドニア">北マケドニア</option>
                  <option value="スロベニア">スロベニア</option><option value="ギリシャ">ギリシャ</option><option value="キプロス">キプロス</option>
                  <option value="マルタ">マルタ</option><option value="イタリア">イタリア</option><option value="バチカン">バチカン</option>
                  <option value="サンマリノ">サンマリノ</option><option value="スペイン">スペイン</option><option value="ポルトガル">ポルトガル</option>
                  <option value="アンドラ">アンドラ</option><option value="フランス">フランス</option><option value="モナコ">モナコ</option>
                  <option value="ベルギー">ベルギー</option><option value="ルクセンブルク">ルクセンブルク</option><option value="オランダ">オランダ</option>
                  <option value="ドイツ">ドイツ</option><option value="オーストリア">オーストリア</option><option value="スイス">スイス</option>
                  <option value="リヒテンシュタイン">リヒテンシュタイン</option><option value="イギリス">イギリス</option><option value="アイルランド">アイルランド</option>
                  <option value="アイスランド">アイスランド</option><option value="ノルウェー">ノルウェー</option><option value="スウェーデン">スウェーデン</option>
                  <option value="フィンランド">フィンランド</option><option value="デンマーク">デンマーク</option><option value="アメリカ">アメリカ</option>
                  <option value="カナダ">カナダ</option><option value="メキシコ">メキシコ</option><option value="グアテマラ">グアテマラ</option>
                  <option value="ベリーズ">ベリーズ</option><option value="エルサルバドル">エルサルバドル</option><option value="ホンジュラス">ホンジュラス</option>
                  <option value="ニカラグア">ニカラグア</option><option value="コスタリカ">コスタリカ</option><option value="パナマ">パナマ</option>
                  <option value="キューバ">キューバ</option><option value="ジャマイカ">ジャマイカ</option><option value="ハイチ">ハイチ</option>
                  <option value="ドミニカ共和国">ドミニカ共和国</option><option value="トリニダード・トバゴ">トリニダード・トバゴ</option>
                  <option value="バルバドス">バルバドス</option><option value="バハマ">バハマ</option><option value="コロンビア">コロンビア</option>
                  <option value="ベネズエラ">ベネズエラ</option><option value="ガイアナ">ガイアナ</option><option value="スリナム">スリナム</option>
                  <option value="エクアドル">エクアドル</option><option value="ペルー">ペルー</option><option value="ボリビア">ボリビア</option>
                  <option value="ブラジル">ブラジル</option><option value="パラグアイ">パラグアイ</option><option value="ウルグアイ">ウルグアイ</option>
                  <option value="アルゼンチン">アルゼンチン</option><option value="チリ">チリ</option><option value="オーストラリア">オーストラリア</option>
                  <option value="ニュージーランド">ニュージーランド</option><option value="パプアニューギニア">パプアニューギニア</option>
                  <option value="フィジー">フィジー</option><option value="ソロモン諸島">ソロモン諸島</option>
                  <option value="バヌアツ">バヌアツ</option><option value="サモア">サモア</option><option value="トンガ">トンガ</option>
                  <option value="キリバス">キリバス</option><option value="ツバル">ツバル</option><option value="ナウル">ナウル</option>
                  <option value="パラオ">パラオ</option><option value="マーシャル諸島">マーシャル諸島</option><option value="ミクロネシア">ミクロネシア</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              {isForeign && (
                <>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">在留資格</label>
                    <select name="residenceStatus" value={formData.residenceStatus} onChange={handleChange} className={inputCls} required={isForeign}>
                      <option value="">選択してください</option>
                      {residenceStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">在留カード番号</label><input type="text" name="residenceCardNumber" value={formData.residenceCardNumber} onChange={handleChange} placeholder="AB12345678" className={inputCls} required={isForeign} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">交付日</label><input type="date" name="residenceCardIssueDate" value={formData.residenceCardIssueDate} onChange={handleChange} className={inputCls} required={isForeign} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">有効期限</label><input type="date" name="residenceExpiry" value={formData.residenceExpiry} onChange={handleChange} className={inputCls} required={isForeign} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">就労制限</label><input type="text" name="workRestriction" value={formData.workRestriction} onChange={handleChange} placeholder="就労制限なし" className={inputCls} /></div>
                </>
              )}
            </div>
          </section>

          {/* 扶養家族 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">扶養家族</h3>
              <button type="button" onClick={addDependent} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ 追加</button>
            </div>
            {formData.dependentList.length === 0 && <p className="text-sm text-slate-400">扶養家族はいません</p>}
            {formData.dependentList.map((dep, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3 p-3 bg-slate-50 rounded-lg">
                <input type="text" placeholder="氏名" value={dep.name} onChange={e => updateDependent(idx, 'name', e.target.value)} className={inputCls} required />
                <input type="text" placeholder="続柄" value={dep.relationship} onChange={e => updateDependent(idx, 'relationship', e.target.value)} className={inputCls} required />
                <input type="date" value={dep.birthDate} onChange={e => updateDependent(idx, 'birthDate', e.target.value)} className={inputCls} />
                <select value={dep.gender} onChange={e => updateDependent(idx, 'gender', e.target.value)} className={inputCls}>
                  <option value="">性別</option><option value="男性">男性</option><option value="女性">女性</option>
                </select>
                <div className="flex gap-2">
                  <select value={dep.cohabitation} onChange={e => updateDependent(idx, 'cohabitation', e.target.value)} className={inputCls}>
                    <option value="同居">同居</option><option value="別居">別居</option>
                  </select>
                  <button type="button" onClick={() => removeDependent(idx)} className="px-3 text-red-500 hover:text-red-700">×</button>
                </div>
              </div>
            ))}
          </section>

          {/* 学歴 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">学歴</h3>
              <button type="button" onClick={addEducation} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ 追加</button>
            </div>
            {formData.education.length === 0 && <p className="text-sm text-slate-400">学歴はありません</p>}
            {formData.education.map((edu, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 p-3 bg-slate-50 rounded-lg">
                <input type="text" placeholder="学校名" value={edu.school} onChange={e => updateEducation(idx, 'school', e.target.value)} className={inputCls} required />
                <input type="text" placeholder="学位" value={edu.degree} onChange={e => updateEducation(idx, 'degree', e.target.value)} className={inputCls} />
                <input type="text" placeholder="専攻" value={edu.major} onChange={e => updateEducation(idx, 'major', e.target.value)} className={inputCls} />
                <div className="flex gap-2">
                  <input type="text" placeholder="卒業年" value={edu.graduationYear} onChange={e => updateEducation(idx, 'graduationYear', e.target.value)} className={inputCls} />
                  <button type="button" onClick={() => removeEducation(idx)} className="px-3 text-red-500 hover:text-red-700">×</button>
                </div>
              </div>
            ))}
          </section>

          {/* 資格 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">資格</h3>
              <button type="button" onClick={addCertification} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ 追加</button>
            </div>
            {formData.certifications.length === 0 && <p className="text-sm text-slate-400">資格はありません</p>}
            {formData.certifications.map((cert, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 p-3 bg-slate-50 rounded-lg">
                <input type="text" placeholder="資格名" value={cert.name} onChange={e => updateCertification(idx, 'name', e.target.value)} className={inputCls} required />
                <input type="text" placeholder="発行元" value={cert.issuer} onChange={e => updateCertification(idx, 'issuer', e.target.value)} className={inputCls} />
                <input type="date" value={cert.acquiredDate} onChange={e => updateCertification(idx, 'acquiredDate', e.target.value)} className={inputCls} />
                <div className="flex gap-2">
                  <input type="date" value={cert.expiryDate} onChange={e => updateCertification(idx, 'expiryDate', e.target.value)} className={inputCls} />
                  <button type="button" onClick={() => removeCertification(idx)} className="px-3 text-red-500 hover:text-red-700">×</button>
                </div>
              </div>
            ))}
          </section>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">キャンセル</button>
            <button type="submit" className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{employee ? '更新' : '作成'}</button>
          </div>
        </form>
      </div>

      <ManagementModal
        isOpen={manageDeptOpen}
        onClose={() => { setManageDeptOpen(false); fetchDepartments(); }}
        title="部署"
        apiPath="/api/departments"
      />
      <ManagementModal
        isOpen={managePosOpen}
        onClose={() => { setManagePosOpen(false); fetchPositions(); }}
        title="役職"
        apiPath="/api/positions"
      />
      <ManagementModal
        isOpen={manageContractOpen}
        onClose={() => { setManageContractOpen(false); fetchContractTypes(); }}
        title="雇用形態"
        apiPath="/api/contract-types"
      />
    </div>
    </Portal>
  );
}
