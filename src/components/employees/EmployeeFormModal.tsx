'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Employee, Dependent, Education, Certification, ResidenceCardHistory, Department, Position, ContractType, Shiten } from '@/types';
import ManagementModal from '@/components/common/ManagementModal';
import ContractTypeManagementModal from '@/components/common/ContractTypeManagementModal';
import Portal from '@/components/common/Portal';
import { useI18n } from '@/lib/i18n';
import { countryOptions, visaOptions, getCountryLabel, getVisaStatusLabel } from '@/lib/translations/options';

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
  insuranceSalary: string;
  status: string;
  nationality: string;
  residenceStatus: string;
  residenceCardNumber: string;
  residenceCardIssueDate: string;
  residenceExpiry: string;
  workRestriction: string;
  residenceCardImage: string;
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
    residentTax: boolean;
    residentTaxAmount: string;
  };
  dependentList: Dependent[];
  education: Education[];
  certifications: Certification[];
  residenceCardHistory: ResidenceCardHistory[];
  shitenIds: string[];
  workDays: number[];
  standardHoursPerDay: string;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultBreakStart: string;
  defaultBreakEnd: string;
  holidayWorkCountsAsOvertime: boolean;
}

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Employee, 'id'> & { shitenIds?: string[] }, id?: string) => void;
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
  insuranceSalary: '',
  status: 'ACTIVE',
  nationality: '日本',
  residenceStatus: '',
  residenceCardNumber: '',
  residenceCardIssueDate: '',
  residenceExpiry: '',
  workRestriction: '',
  residenceCardImage: '',
  contractTypeId: '',
  contractStartDate: new Date().toISOString().split('T')[0],
  contractEndDate: '',
  contractEndDateType: 'none',
  salaryType: '月給',
  hourlyRate: '',
  dailyRate: '',
  benefits: { healthInsurance: false, pension: false, employmentInsurance: false, workersComp: false, transportation: '', housing: '', meal: '', residentTax: false, residentTaxAmount: '' },
  dependentList: [],
  education: [],
  certifications: [],
  residenceCardHistory: [],
  shitenIds: [],
  workDays: [1, 2, 3, 4, 5],
  standardHoursPerDay: '8',
  defaultCheckIn: '08:00',
  defaultCheckOut: '17:00',
  defaultBreakStart: '12:00',
  defaultBreakEnd: '13:00',
  holidayWorkCountsAsOvertime: true,
};

const emptyDependent: Dependent = { name: '', relationship: '', birthDate: '', gender: '', cohabitation: '\u540c\u5c45' };
const emptyEducation: Education = { school: '', degree: '', major: '', graduationYear: '' };
const emptyCertification: Certification = { name: '', issuer: '', acquiredDate: '', expiryDate: '' };

const toInputValue = (value: unknown) => value == null ? '' : String(value);
const toDateInputValue = (value: string | null | undefined) => value ? value.split('T')[0] : '';

export default function EmployeeFormModal({ isOpen, onClose, onSave, employee }: EmployeeFormModalProps) {
  const { t, locale } = useI18n();
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [shitens, setShitens] = useState<Shiten[]>([]);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCard, setIsUploadingCard] = useState(false);
  const [manageDeptOpen, setManageDeptOpen] = useState(false);
  const [managePosOpen, setManagePosOpen] = useState(false);
  const [manageContractOpen, setManageContractOpen] = useState(false);

  const isForeign = formData.nationality !== '日本';

  const fetchDepartments = useCallback(async () => {
    const res = await fetch('/api/departments');
    const data = await res.json();
    setDepartments(data);
  }, []);

  const fetchPositions = useCallback(async () => {
    const res = await fetch('/api/positions');
    const data = await res.json();
    setPositions(data);
  }, []);

  const fetchContractTypes = useCallback(async () => {
    const res = await fetch('/api/contract-types');
    const data = await res.json();
    setContractTypes(data);
  }, []);

  const fetchShitens = useCallback(async () => {
    const res = await fetch('/api/shitens');
    const data = await res.json();
    setShitens(data);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchPositions();
      fetchContractTypes();
      fetchShitens();
    }
  }, [isOpen, fetchDepartments, fetchPositions, fetchContractTypes, fetchShitens]);

  useEffect(() => {
    if (employee) {
      const benefits = employee.benefits as any;
      const activeContract = employee.employeeContracts?.find((c: any) => c.isActive) || employee.employeeContracts?.[0] || null;
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
        insuranceSalary: employee.insuranceSalary ? employee.insuranceSalary.toString() : '',
        status: toInputValue(employee.status) || 'ACTIVE',
        nationality: toInputValue(employee.nationality) || '\u65e5\u672c',
        residenceStatus: toInputValue(employee.residenceStatus),
        residenceCardNumber: toInputValue(employee.residenceCardNumber),
        residenceCardIssueDate: toDateInputValue(employee.residenceCardIssueDate),
        residenceExpiry: toDateInputValue(employee.residenceExpiry),
        workRestriction: toInputValue(employee.workRestriction),
        contractTypeId: toInputValue(employee.contractTypeId),
        contractStartDate: toDateInputValue(employee.contractStartDate),
        contractEndDate: toDateInputValue(employee.contractEndDate),
        contractEndDateType: toInputValue(employee.contractEndDateType) || 'none',
        salaryType: toInputValue(employee.salaryType) || '\u6708\u7d66',
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
          residentTax: !!benefits?.residentTax,
          residentTaxAmount: toInputValue(benefits?.residentTaxAmount),
        },
        dependentList: (employee.dependents || []).map(d => ({
          ...d,
          name: toInputValue(d.name),
          relationship: toInputValue(d.relationship),
          birthDate: toDateInputValue(d.birthDate),
          gender: toInputValue(d.gender),
          cohabitation: toInputValue(d.cohabitation) || '\u540c\u5c45',
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
        residenceCardImage: toInputValue(employee.residenceCardImage),
        shitenIds: (employee.shitens || []).map(s => s.id),
        workDays: activeContract?.workDays || [1, 2, 3, 4, 5],
        standardHoursPerDay: activeContract?.standardHoursPerDay?.toString() || '8',
        defaultCheckIn: activeContract?.defaultCheckIn || '08:00',
        defaultCheckOut: activeContract?.defaultCheckOut || '17:00',
        defaultBreakStart: activeContract?.defaultBreakStart || '12:00',
        defaultBreakEnd: activeContract?.defaultBreakEnd || '13:00',
        holidayWorkCountsAsOvertime: activeContract?.holidayWorkCountsAsOvertime ?? true,
      });
      setAutoGenerateCode(false);
    } else {
      setFormData(emptyForm);
      setAutoGenerateCode(true);
    }
  }, [employee, isOpen]);



  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'contractTypeId') {
        const selected = contractTypes.find(c => c.id === value);
        if (selected) {
          next.contractEndDateType = selected.defaultEndDateType;
          next.salaryType = selected.defaultSalaryType;
          next.workDays = (selected as any).defaultWorkDays || [1, 2, 3, 4, 5];
          next.standardHoursPerDay = (selected as any).defaultStandardHoursPerDay?.toString() || '8';
          next.defaultCheckIn = (selected as any).defaultCheckIn || '08:00';
          next.defaultCheckOut = (selected as any).defaultCheckOut || '17:00';
          next.defaultBreakStart = (selected as any).defaultBreakStart || '12:00';
          next.defaultBreakEnd = (selected as any).defaultBreakEnd || '13:00';
          next.holidayWorkCountsAsOvertime = (selected as any).defaultHolidayWorkCountsAsOvertime ?? true;
        }
      }
      if (name === 'contractEndDateType') {
        if (value === 'none') next.contractEndDate = '';
      }
      if (name === 'status') {
        if (value === 'INACTIVE') {
          next.contractEndDateType = 'fixed';
          next.contractEndDate = prev.contractEndDate || new Date().toISOString().split('T')[0];
        }
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

  const uploadFile = async (file: File, type: 'avatar' | 'residence-card'): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      fd.append('employeeCode', formData.employeeCode || 'temp');
      fd.append('status', 'valid');
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd
      });
      if (!res.ok) {
        throw new Error('Upload failed');
      }
      const json = await res.json();
      return json.url;
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed');
      return null;
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    const url = await uploadFile(file, 'avatar');
    setIsUploadingAvatar(false);
    if (url) {
      setFormData(prev => ({ ...prev, avatar: url }));
    }
  };

  const handleCardImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCard(true);
    const url = await uploadFile(file, 'residence-card');
    setIsUploadingCard(false);
    if (url) {
      setFormData(prev => ({ ...prev, residenceCardImage: url }));
    }
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
        insuranceSalary: formData.insuranceSalary ? parseFloat(formData.insuranceSalary) : null,
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
          familyAllowance: parseFloat((employee?.benefits as any)?.familyAllowance) || 0,
          overtimeAllowance: parseFloat((employee?.benefits as any)?.overtimeAllowance) || 0,
          dependents: parseFloat((employee?.benefits as any)?.dependents) || 0,
          residentTax: formData.benefits.residentTax,
          residentTaxAmount: parseFloat(formData.benefits.residentTaxAmount) || 0,
        },
        dependents: formData.dependentList,
        education: formData.education,
        certifications: formData.certifications,
        residenceCardHistory: formData.residenceCardHistory as any,
        residenceCardImage: isForeign ? (formData.residenceCardImage || null) : null,
        shitenIds: formData.shitenIds,
        workDays: formData.workDays,
        standardHoursPerDay: parseFloat(formData.standardHoursPerDay) || 8,
        defaultCheckIn: formData.defaultCheckIn || '08:00',
        defaultCheckOut: formData.defaultCheckOut || '17:00',
        defaultBreakStart: formData.defaultBreakStart || '12:00',
        defaultBreakEnd: formData.defaultBreakEnd || '13:00',
        holidayWorkCountsAsOvertime: formData.holidayWorkCountsAsOvertime,
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
              {employee ? t('form.editTitle') : t('form.addTitle')}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* アバター */}
            <section className="flex items-center gap-6">
              <div className="relative">
                {isUploadingAvatar ? (
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : formData.avatar ? (
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
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" disabled={isUploadingAvatar} />
                </label>
              </div>
              <div className="flex-1">
                <label className="flex items-center gap-2 mb-2">
                  <input type="checkbox" checked={autoGenerateCode} onChange={e => setAutoGenerateCode(e.target.checked)} disabled={!!employee} className="rounded" />
                  <span className="text-sm text-slate-600">{t('form.autoCode')}</span>
                </label>
                {!autoGenerateCode && (
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.code')}</label><input type="text" name="employeeCode" value={formData.employeeCode} onChange={handleChange} placeholder="NV001" className={inputCls} required /></div>
                )}
              </div>
            </section>

            {/* 基本情報 */}
            <section>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('form.basicTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.lastName')}</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder={t('form.lastNamePlaceholder')} className={inputCls} required /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.firstName')}</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder={t('form.firstNamePlaceholder')} className={inputCls} required /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.lastNameKana')}</label><input type="text" name="lastNameKana" value={formData.lastNameKana} onChange={handleChange} placeholder={t('form.lastNameKanaPlaceholder')} className={inputCls} required /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.firstNameKana')}</label><input type="text" name="firstNameKana" value={formData.firstNameKana} onChange={handleChange} placeholder={t('form.firstNameKanaPlaceholder')} className={inputCls} required /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.email')}</label><input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@company.jp" className={inputCls} required /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.phone')}</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="090-1234-5678" className={inputCls} required /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.birthDate')}</label><input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className={inputCls} /></div>
              </div>
            </section>

            {/* 勤務情報 */}
            <section>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('form.workTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('form.dept')}</label>
                  <div className="flex gap-2">
                    <select name="departmentId" value={formData.departmentId} onChange={handleChange} className={inputCls + ' flex-1'} required>
                      <option value="">{t('form.deptSelect')}</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name} (ID: {d.id})</option>)}
                    </select>
                    <button type="button" onClick={() => setManageDeptOpen(true)} className="px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap">{t('form.manage')}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('form.pos')}</label>
                  <div className="flex gap-2">
                    <select name="positionId" value={formData.positionId} onChange={handleChange} className={inputCls + ' flex-1'} required>
                      <option value="">{t('form.posSelect')}</option>
                      {positions.map(p => <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>)}
                    </select>
                    <button type="button" onClick={() => setManagePosOpen(true)} className="px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap">{t('form.manage')}</button>
                  </div>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.hireDate')}</label><input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} className={inputCls} required /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.status')}</label>
                  <select name="status" value={formData.status} onChange={handleChange} className={inputCls} required>
                    <option value="ACTIVE">{t('form.statusActive')}</option>
                    <option value="ON_LEAVE">{t('form.statusLeave')}</option>
                    <option value="INACTIVE">{t('form.statusInactive')}</option>
                  </select>
                </div>
                {formData.status === 'INACTIVE' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('form.resignationDate') || '退職日'}
                    </label>
                    <input
                      type="date"
                      name="contractEndDate"
                      value={formData.contractEndDate}
                      onChange={(e) => {
                        handleChange(e);
                        setFormData(prev => ({ ...prev, contractEndDateType: 'fixed' }));
                      }}
                      className={inputCls}
                      required
                    />
                  </div>
                )}
                {employee?.status === 'INACTIVE' && formData.status === 'ACTIVE' && (
                  <div className="md:col-span-2 p-4 bg-amber-50 border border-amber-250/60 rounded-2xl text-xs text-amber-800 font-semibold flex items-start gap-3 shadow-xs">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="font-extrabold text-sm text-slate-800">{t('client.rehireTitle') || '再雇用処理'}</p>
                      <p className="mt-1 text-amber-700 font-bold leading-relaxed">
                        {t('client.rehireNotice') || 'この従業員は退職済みです。在籍中に変更すると再雇用処理が行われ、古い勤務契約が終了し新しい勤務契約が開始されます。新しい入社日と契約開始日を入力してください。'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('shitens.labelShitens')}</label>
                {shitens.length === 0 ? (
                  <p className="text-xs text-slate-400">{t('shitens.noShiten')}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {shitens.map(s => {
                      const isChecked = formData.shitenIds.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 hover:text-slate-900">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                shitenIds: checked 
                                  ? [...prev.shitenIds, s.id]
                                  : prev.shitenIds.filter(id => id !== s.id)
                              }));
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{locale === 'ja' ? (s.nameKana ? `${s.name} (${s.nameKana})` : s.name) : s.name} <span className="text-[10px] text-slate-400 font-mono">(ID: {s.id})</span></span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* 契約情報 */}
            <section>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('form.contractTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('form.contractType')}</label>
                  <div className="flex gap-2">
                    <select name="contractTypeId" value={formData.contractTypeId} onChange={handleChange} className={inputCls + ' flex-1'} required>
                      <option value="">{t('form.contractTypeSelect')}</option>
                      {contractTypes.map(c => <option key={c.id} value={c.id}>{c.name} (ID: {c.id})</option>)}
                    </select>
                    <button type="button" onClick={() => setManageContractOpen(true)} className="px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap">{t('form.manage')}</button>
                  </div>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.contractStart')}</label><input type="date" name="contractStartDate" value={formData.contractStartDate} onChange={handleChange} className={inputCls} required /></div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('form.contractPeriod')}</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="contractEndDateType" value="none" checked={formData.contractEndDateType === 'none'}
                        onChange={e => setFormData(prev => ({ ...prev, contractEndDateType: e.target.value, contractEndDate: '' }))}
                        className="text-blue-600" />
                      <span className="text-sm text-slate-700">{t('form.periodIndefinite')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="contractEndDateType" value="fixed" checked={formData.contractEndDateType === 'fixed'}
                        onChange={e => setFormData(prev => ({ ...prev, contractEndDateType: e.target.value }))}
                        className="text-blue-600" />
                      <span className="text-sm text-slate-700">{t('form.periodFixed')}</span>
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
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('form.salaryTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.salaryType')}</label>
                  <select name="salaryType" value={formData.salaryType} onChange={handleChange} className={inputCls} required>
                    <option value="月給">{t('form.salaryTypeMonthly')}</option>
                    <option value="日給">{t('form.salaryTypeDaily')}</option>
                    <option value="時給">{t('form.salaryTypeHourly')}</option>
                  </select>
                </div>
                {formData.salaryType === '\u6708\u7d66' && (
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.baseSalary')}</label><input type="number" name="salary" value={formData.salary} onChange={handleChange} placeholder="450000" className={inputCls} required /></div>
                )}
                {formData.salaryType === '\u65e5\u7d66' && (
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.dailyRate')}</label><input type="number" name="dailyRate" value={formData.dailyRate} onChange={handleChange} placeholder="12000" className={inputCls} required /></div>
                )}
                {formData.salaryType === '\u6642\u7d66' && (
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.hourlyRate')}</label><input type="number" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} placeholder="1500" className={inputCls} required /></div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('form.insuranceSalaryLabel')}</label>
                  <input type="number" name="insuranceSalary" value={formData.insuranceSalary} onChange={handleChange} placeholder={t('form.insuranceSalaryPlaceholder')} className={inputCls} />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('form.socialInsurance')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.benefits.healthInsurance} onChange={e => handleBenefitsChange('healthInsurance', e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-700">{t('form.healthIns')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.benefits.pension} onChange={e => handleBenefitsChange('pension', e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-700">{t('form.pension')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.benefits.employmentInsurance} onChange={e => handleBenefitsChange('employmentInsurance', e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-700">{t('form.empIns')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.benefits.workersComp} onChange={e => handleBenefitsChange('workersComp', e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-700">{t('form.workersComp')}</span>
                  </label>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('form.residentTax')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.benefits.residentTax} onChange={e => handleBenefitsChange('residentTax', e.target.checked)} className="rounded border-slate-300 text-blue-600" />
                      <span className="text-sm text-slate-700">{t('form.residentTax')}</span>
                    </label>
                  </div>
                  {formData.benefits.residentTax && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('form.residentTaxAmount')}</label>
                      <input type="number" value={formData.benefits.residentTaxAmount} onChange={e => handleBenefitsChange('residentTaxAmount', e.target.value)} placeholder="10000" className={inputCls} />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('form.benefitsTitle')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.transport')}</label><input type="number" value={formData.benefits.transportation} onChange={e => handleBenefitsChange('transportation', e.target.value)} placeholder="15000" className={inputCls} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.housing')}</label><input type="number" value={formData.benefits.housing} onChange={e => handleBenefitsChange('housing', e.target.value)} placeholder="30000" className={inputCls} /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.meal')}</label><input type="number" value={formData.benefits.meal} onChange={e => handleBenefitsChange('meal', e.target.value)} placeholder="10000" className={inputCls} /></div>
                </div>
              </div>
            </section>

            {/* 国籍・在留資格 */}
            <section>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('form.visaTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.nationality')}</label>
                  <select name="nationality" value={formData.nationality} onChange={handleChange} className={inputCls}>
                    {countryOptions.map(c => (
                      <option key={c} value={c}>{getCountryLabel(c, locale)}</option>
                    ))}
                  </select>
                </div>
                {isForeign && (
                  <>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.visaType')}</label>
                      <select name="residenceStatus" value={formData.residenceStatus} onChange={handleChange} className={inputCls}>
                        <option value="">{t('common.select')}</option>
                        {visaOptions.map(s => <option key={s} value={s}>{getVisaStatusLabel(s, locale)}</option>)}
                      </select>
                    </div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.visaNo')}</label><input type="text" name="residenceCardNumber" value={formData.residenceCardNumber} onChange={handleChange} placeholder="AB12345678" className={inputCls} /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.issueDate')}</label><input type="date" name="residenceCardIssueDate" value={formData.residenceCardIssueDate} onChange={handleChange} className={inputCls} /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.expiryDate')}</label><input type="date" name="residenceExpiry" value={formData.residenceExpiry} onChange={handleChange} className={inputCls} /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.restriction')}</label><input type="text" name="workRestriction" value={formData.workRestriction} onChange={handleChange} placeholder={t('form.restrictionNone')} className={inputCls} /></div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('residenceCards.colCardImage')}</label>
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        {formData.residenceCardImage ? (
                          <div className="relative w-24 h-16 rounded border border-slate-200 overflow-hidden bg-white">
                            <img src={formData.residenceCardImage} alt="residence card" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, residenceCardImage: '' }))}
                              className="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-1 hover:bg-red-700 flex items-center justify-center w-5 h-5"
                              title={t('common.delete')}
                            >
                              &times;
                            </button>
                          </div>
                        ) : (
                          <div className="w-24 h-16 rounded bg-slate-200 flex items-center justify-center text-xs text-slate-400">
                            {t('residenceCards.noCardImage')}
                          </div>
                        )}
                        <div className="flex-1">
                          <label className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                            {isUploadingCard ? 'Uploading...' : t('residenceCards.uploadCardImage')}
                            <input type="file" accept="image/*" onChange={handleCardImageChange} className="hidden" disabled={isUploadingCard} />
                          </label>
                          <p className="text-[10px] text-slate-400 mt-1">JPEG, PNG up to 5MB</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 扶養家族 */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('form.dependentsTitle')}</h3>
                <button type="button" onClick={addDependent} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ {t('common.add')}</button>
              </div>
              {formData.dependentList.length === 0 && <p className="text-sm text-slate-400">{t('form.dependentsNone')}</p>}
              {formData.dependentList.map((dep, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3 p-3 bg-slate-50 rounded-lg">
                  <input type="text" placeholder={t('form.depName')} value={dep.name} onChange={e => updateDependent(idx, 'name', e.target.value)} className={inputCls} required />
                  <input type="text" placeholder={t('form.depRel')} value={dep.relationship} onChange={e => updateDependent(idx, 'relationship', e.target.value)} className={inputCls} required />
                  <input type="date" value={dep.birthDate} onChange={e => updateDependent(idx, 'birthDate', e.target.value)} className={inputCls} />
                  <select value={dep.gender} onChange={e => updateDependent(idx, 'gender', e.target.value)} className={inputCls}>
                    <option value="">{t('form.gender')}</option>
                    <option value="男性">{t('form.genderMale')}</option>
                    <option value="女性">{t('form.genderFemale')}</option>
                  </select>
                  <div className="flex gap-2">
                    <select value={dep.cohabitation} onChange={e => updateDependent(idx, 'cohabitation', e.target.value)} className={inputCls}>
                      <option value="同居">{t('form.cohabitYes')}</option>
                      <option value="別居">{t('form.cohabitNo')}</option>
                    </select>
                    <button type="button" onClick={() => removeDependent(idx)} className="px-3 text-red-500 hover:text-red-700">×</button>
                  </div>
                </div>
              ))}
            </section>

            {/* 学歴 */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('form.eduTitle')}</h3>
                <button type="button" onClick={addEducation} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ {t('common.add')}</button>
              </div>
              {formData.education.length === 0 && <p className="text-sm text-slate-400">{t('form.eduNone')}</p>}
              {formData.education.map((edu, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 p-3 bg-slate-50 rounded-lg">
                  <input type="text" placeholder={t('form.school')} value={edu.school} onChange={e => updateEducation(idx, 'school', e.target.value)} className={inputCls} required />
                  <input type="text" placeholder={t('form.degree')} value={edu.degree} onChange={e => updateEducation(idx, 'degree', e.target.value)} className={inputCls} />
                  <input type="text" placeholder={t('form.major')} value={edu.major} onChange={e => updateEducation(idx, 'major', e.target.value)} className={inputCls} />
                  <div className="flex gap-2">
                    <input type="text" placeholder={t('form.gradYear')} value={edu.graduationYear} onChange={e => updateEducation(idx, 'graduationYear', e.target.value)} className={inputCls} />
                    <button type="button" onClick={() => removeEducation(idx)} className="px-3 text-red-500 hover:text-red-700">×</button>
                  </div>
                </div>
              ))}
            </section>

            {/* 資格 */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('form.certTitle')}</h3>
                <button type="button" onClick={addCertification} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ {t('common.add')}</button>
              </div>
              {formData.certifications.length === 0 && <p className="text-sm text-slate-400">{t('form.certNone')}</p>}
              {formData.certifications.map((cert, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 p-3 bg-slate-50 rounded-lg">
                  <input type="text" placeholder={t('form.certName')} value={cert.name} onChange={e => updateCertification(idx, 'name', e.target.value)} className={inputCls} required />
                  <input type="text" placeholder={t('form.issuer')} value={cert.issuer} onChange={e => updateCertification(idx, 'issuer', e.target.value)} className={inputCls} />
                  <input type="date" value={cert.acquiredDate} onChange={e => updateCertification(idx, 'acquiredDate', e.target.value)} className={inputCls} />
                  <div className="flex gap-2">
                    <input type="date" value={cert.expiryDate} onChange={e => updateCertification(idx, 'expiryDate', e.target.value)} className={inputCls} />
                    <button type="button" onClick={() => removeCertification(idx)} className="px-3 text-red-500 hover:text-red-700">×</button>
                  </div>
                </div>
              ))}
            </section>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-6 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">{t('form.cancel')}</button>
              <button type="submit" className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{employee ? t('form.update') : t('form.create')}</button>
            </div>
          </form>
        </div>
      <ManagementModal
        isOpen={manageDeptOpen}
        onClose={() => { setManageDeptOpen(false); fetchDepartments(); }}
        title={t('form.dept')}
        apiPath="/api/departments"
        enableImport={true}
        importPayloadKey="departments"
        importTemplateJson={JSON.stringify([
          {
            "name": "開発部",
            "nameKana": "カイハツブ",
            "description": "システム開発と技術研究を行う部門"
          }
        ], null, 2)}
      />
      <ManagementModal
        isOpen={managePosOpen}
        onClose={() => { setManagePosOpen(false); fetchPositions(); }}
        title={t('form.pos')}
        apiPath="/api/positions"
        showAllowance={true}
        enableImport={true}
        importPayloadKey="positions"
        importTemplateJson={JSON.stringify([
          {
            "name": "マネージャー",
            "nameKana": "マネージャー",
            "description": "部門統括者",
            "allowance": 30000
          },
          {
            "name": "一般社員",
            "nameKana": "イッパンシャイン",
            "description": "担当業務の遂行",
            "allowance": 0
          }
        ], null, 2)}
      />
      <ContractTypeManagementModal
        isOpen={manageContractOpen}
        onClose={() => { setManageContractOpen(false); fetchContractTypes(); }}
      />
    </div>
    </Portal>
  );
}
