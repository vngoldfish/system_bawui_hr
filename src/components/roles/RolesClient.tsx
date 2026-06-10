'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';
import ExportButtons from '@/components/common/ExportButtons';


interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  lastNameKana: string;
  email: string;
  birthDate: string;
  department: string;
  position: string;
  role: string;
  password: string;
}

interface RolePermissionProp {
  role: string;
  permission: string;
}

interface PermissionProp {
  key: string;
  category: string;
  name: string;
  description: string;
}

interface RolesClientProps {
  employees: Employee[];
  initialRolePermissions: RolePermissionProp[];
  initialPermissions: PermissionProp[];
}

const getRoleLabel = (role: string, t: any) => {
  const isVi = t('roles.title').includes('Phân quyền');
  const isEn = t('roles.title').includes('Roles');
  const isZh = t('roles.title').includes('角色');
  const isTh = t('roles.title').includes('สิทธิ์');

  if (role === 'SUPER_ADMIN') return isVi ? 'Quản trị viên tối cao (SUPER_ADMIN)' : isEn ? 'System Administrator (SUPER_ADMIN)' : isZh ? '超级管理员 (SUPER_ADMIN)' : isTh ? 'ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)' : 'システム管理者 (SUPER_ADMIN)';
  if (role === 'HR_MANAGER' || role === 'ADMIN') return isVi ? 'Nhân viên nhân sự (HR_MANAGER)' : isEn ? 'HR Generalist (HR_MANAGER)' : isZh ? '人事总务 (HR_MANAGER)' : isTh ? 'เจ้าหน้าที่ฝ่ายบุคคล (HR_MANAGER)' : '人事責任者 (HR_MANAGER)';
  if (role === 'DEPARTMENT_MANAGER' || role === 'MANAGER') return isVi ? 'Quản lý bộ phận (DEPT_MANAGER)' : isEn ? 'Department Manager (DEPT_MANAGER)' : isZh ? '部门主管 (DEPT_MANAGER)' : isTh ? 'ผู้จัดการแผนก (DEPT_MANAGER)' : '部門責任者 (DEPT_MANAGER)';
  if (role === 'EMPLOYEE') return isVi ? 'Nhân viên thông thường (EMPLOYEE)' : isEn ? 'Standard Employee (EMPLOYEE)' : isZh ? '一般员工 (EMPLOYEE)' : isTh ? 'พนักงานทั่วไป (EMPLOYEE)' : '一般従業員 (EMPLOYEE)';
  if (role === 'VIEWER') return isVi ? 'Xem chuyên dụng (VIEWER)' : isEn ? 'Viewer (VIEWER)' : isZh ? '仅只读 (VIEWER)' : isTh ? 'ดูอย่างเดียว (VIEWER)' : '閲覧専用 (VIEWER)';
  return role;
};

const getTabLabel = (tab: 'accounts' | 'matrix', t: any) => {
  const isVi = t('roles.title').includes('Phân quyền');
  const isEn = t('roles.title').includes('Roles');
  const isZh = t('roles.title').includes('角色');
  const isTh = t('roles.title').includes('สิทธิ์');
  
  if (tab === 'accounts') {
    return isVi ? '👤 Danh sách tài khoản / Mật khẩu' : isEn ? '👤 Accounts & Passwords' : isZh ? '👤 账号列表与密码' : isTh ? '👤 รายชื่อผู้ใช้ & รหัสผ่าน' : '👤 アカウント一覧・PW設定';
  } else {
    return isVi ? '🔑 Vai trò & Ma trận phân quyền' : isEn ? '🔑 Roles & Permissions Matrix' : isZh ? '🔑 角色权限控制矩阵' : isTh ? '🔑 บทบาท & ตารางสิทธิ์เข้าถึง' : '🔑 役割・機能権限マトリクス';
  }
};

const getCategoryLabel = (cat: string, t: any) => {
  if (cat.includes('Employees') || cat.includes('従業員')) return t('roles.catEmployees');
  if (cat.includes('Attendance') || cat.includes('勤怠')) return t('roles.catAttendance');
  if (cat.includes('Leave') || cat.includes('休暇')) return t('roles.catLeave');
  if (cat.includes('Payroll') || cat.includes('給与')) return t('roles.catPayroll');
  if (cat.includes('Settings') || cat.includes('システム')) return t('roles.catSettings');
  return cat;
};

const getPermissionTranslation = (key: string, name: string, desc: string, t: any) => {
  switch (key) {
    case 'employees:view': return { name: t('roles.permEmployeesView'), desc: desc };
    case 'employees:create': return { name: t('roles.permEmployeesCreate'), desc: desc };
    case 'employees:delete': return { name: t('roles.permEmployeesDelete'), desc: desc };
    case 'residence:view': return { name: t('roles.permResidenceView'), desc: desc };
    case 'attendance:view': return { name: t('roles.permAttendanceView'), desc: desc };
    case 'attendance:modify': return { name: t('roles.permAttendanceModify'), desc: desc };
    case 'leave:view': return { name: t('roles.permLeaveView'), desc: desc };
    case 'payroll:view': return { name: t('roles.permPayrollView'), desc: desc };
    case 'settings:view': return { name: t('roles.permSettingsView'), desc: desc };
    default: return { name, desc };
  }
};

const getDepartmentLabel = (dept: string, t: any) => {
  const isVi = t('roles.title').includes('Phân quyền');
  const isEn = t('roles.title').includes('Roles');
  const isZh = t('roles.title').includes('角色');
  const isTh = t('roles.title').includes('สิทธิ์');
  if (dept === '開発部') return isVi ? 'Bộ phận phát triển' : isEn ? 'Development' : isZh ? '研发部' : isTh ? 'ฝ่ายพัฒนา' : '開発部';
  if (dept === '営業部') return isVi ? 'Bộ phận kinh doanh' : isEn ? 'Sales' : isZh ? '销售部' : isTh ? 'ฝ่ายขาย' : '営業部';
  if (dept === '経理部') return isVi ? 'Bộ phận kế toán' : isEn ? 'Accounting' : isZh ? '财务部' : isTh ? 'ฝ่ายบัญชี' : '経理部';
  if (dept === '人事部') return isVi ? 'Bộ phận nhân sự' : isEn ? 'HR' : isZh ? '人事部' : isTh ? 'ฝ่ายบุคคล' : '人事部';
  return dept;
};

const getPositionLabel = (pos: string, t: any) => {
  const isVi = t('roles.title').includes('Phân quyền');
  const isEn = t('roles.title').includes('Roles');
  const isZh = t('roles.title').includes('角色');
  const isTh = t('roles.title').includes('สิทธิ์');
  if (pos === '課長') return isVi ? 'Trưởng phòng' : isEn ? 'Manager' : isZh ? '课长' : isTh ? 'ผู้จัดการ' : '課長';
  if (pos === '部長') return isVi ? 'Trưởng bộ phận' : isEn ? 'Director' : isZh ? '部长' : isTh ? 'ผู้อำนวยการ' : '部長';
  if (pos === '一般') return isVi ? 'Nhân viên' : isEn ? 'Staff' : isZh ? '普通员工' : isTh ? 'พนักงานทั่วไป' : '一般';
  return pos;
};

export default function RolesClient({ employees: initialEmployees, initialRolePermissions, initialPermissions }: RolesClientProps) {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<'accounts' | 'matrix'>('accounts');
  
  // Account List state
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState('');
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);

  const [editedValues, setEditedValues] = useState<Record<string, { role: string; password: string }>>({});
  
  // Permissions List state (Dynamic)
  const [permissions, setPermissions] = useState<PermissionProp[]>(initialPermissions);
  
  // Add Permission Modal state
  const [showAddPermissionModal, setShowAddPermissionModal] = useState(false);
  const [newPermission, setNewPermission] = useState({
    key: '',
    name: '',
    category: '',
    description: '',
  });
  const [addingPermission, setAddingPermission] = useState(false);

  // Matrix permissions state: Record<Role, PermissionKeys[]>
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {
      SUPER_ADMIN: [],
      HR_MANAGER: [],
      DEPARTMENT_MANAGER: [],
      EMPLOYEE: [],
      VIEWER: [],
    };
    initialRolePermissions.forEach(rp => {
      if (initial[rp.role]) {
        initial[rp.role].push(rp.permission);
      }
    });
    return initial;
  });
  const [matrixChanged, setMatrixChanged] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);

  // Alert message state
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ROLE OPTIONS
  const roleOptions = useMemo(() => [
    { value: 'SUPER_ADMIN', label: getRoleLabel('SUPER_ADMIN', t), color: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'HR_MANAGER', label: getRoleLabel('HR_MANAGER', t), color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { value: 'DEPARTMENT_MANAGER', label: getRoleLabel('DEPARTMENT_MANAGER', t), color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'EMPLOYEE', label: getRoleLabel('EMPLOYEE', t), color: 'bg-green-50 text-green-700 border-green-200' },
    { value: 'VIEWER', label: getRoleLabel('VIEWER', t), color: 'bg-slate-100 text-slate-600 border-slate-200' },
  ], [t]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        emp.employeeCode.toLowerCase().includes(q) ||
        emp.lastName.toLowerCase().includes(q) ||
        emp.firstName.toLowerCase().includes(q) ||
        emp.lastNameKana.toLowerCase().includes(q) ||
        emp.firstNameKana.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.position.toLowerCase().includes(q)
      );
    });
  }, [employees, search]);

  const exportData = useMemo(() => {
    return filteredEmployees.map(emp => {
      return {
        code: emp.employeeCode,
        name: `${emp.lastName} ${emp.firstName}`,
        department: getDepartmentLabel(emp.department, t),
        position: getPositionLabel(emp.position, t),
        email: emp.email,
        role: emp.role,
        password: emp.password,
      };
    });
  }, [filteredEmployees, t]);

  const handleRoleChange = (id: string, newRole: string) => {
    setEditedValues(prev => {
      const current = prev[id] || {
        role: employees.find(e => e.id === id)?.role || 'EMPLOYEE',
        password: employees.find(e => e.id === id)?.password || '',
      };
      return {
        ...prev,
        [id]: { ...current, role: newRole },
      };
    });
  };

  const handlePasswordChange = (id: string, newPassword: string) => {
    setEditedValues(prev => {
      const current = prev[id] || {
        role: employees.find(e => e.id === id)?.role || 'EMPLOYEE',
        password: employees.find(e => e.id === id)?.password || '',
      };
      return {
        ...prev,
        [id]: { ...current, password: newPassword },
      };
    });
  };

  const generateDefaultPassword = (emp: Employee) => {
    const cleanBirth = emp.birthDate ? emp.birthDate.replace(/-/g, '') : '123456';
    return emp.employeeCode + cleanBirth;
  };

  const handleResetToDefault = (emp: Employee) => {
    const defaultPass = generateDefaultPassword(emp);
    handlePasswordChange(emp.id, defaultPass);
    const isVi = t('roles.title').includes('Phân quyền');
    const isEn = t('roles.title').includes('Roles');
    const isZh = t('roles.title').includes('角色');
    const isTh = t('roles.title').includes('สิทธิ์');
    const msg = isVi 
      ? `Đã cấu hình mật khẩu mặc định của ${emp.lastName} ${emp.firstName} là "${defaultPass}" (Hãy nhấp Lưu để áp dụng)`
      : isEn
      ? `Set temporary password for ${emp.lastName} ${emp.firstName} to "${defaultPass}" (Click save to apply)`
      : isZh
      ? `已为 ${emp.lastName} ${emp.firstName} 设定默认密码 "${defaultPass}"（点击保存生效）`
      : isTh
      ? `ตั้งค่ารหัสผ่านเริ่มต้นสำหรับ ${emp.lastName} ${emp.firstName} เป็น "${defaultPass}" เรียบร้อย (กดบันทึกเพื่อบันทึกการเปลี่ยนแปลง)`
      : `${emp.lastName} ${emp.firstName} のパスワード入力をデフォルト値「${defaultPass}」に設定しました（保存ボタンを押すと適用されます）`;
    showAlert('success', msg);
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 6000);
  };

  const handleSaveEmployee = async (emp: Employee) => {
    const edits = editedValues[emp.id];
    if (!edits) return;

    setLoadingRowId(emp.id);
    const isVi = t('roles.title').includes('Phân quyền');
    const isEn = t('roles.title').includes('Roles');
    const isZh = t('roles.title').includes('角色');
    const isTh = t('roles.title').includes('สิทธิ์');
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: edits.role,
          password: edits.password,
        }),
      });

      if (!res.ok) {
        throw new Error(isVi ? 'Không thể lưu thay đổi.' : isEn ? 'Failed to save changes.' : isZh ? '修改保存失败。' : isTh ? 'บันทึกการเปลี่ยนแปลงไม่สำเร็จ' : '変更の保存に失敗しました。');
      }

      setEmployees(prev =>
        prev.map(e => (e.id === emp.id ? { ...e, role: edits.role, password: edits.password } : e))
      );
      
      setEditedValues(prev => {
        const next = { ...prev };
        delete next[emp.id];
        return next;
      });

      const successMsg = isVi 
        ? `Đã lưu vai trò và mật khẩu mới cho ${emp.lastName} ${emp.firstName}.`
        : isEn
        ? `Updated role and password for ${emp.lastName} ${emp.firstName} successfully.`
        : isZh
        ? `已成功保存 ${emp.lastName} ${emp.firstName} 的权限与密码。`
        : isTh
        ? `บันทึกบทบาทและรหัสผ่านสำหรับ ${emp.lastName} ${emp.firstName} สำเร็จ`
        : `${emp.lastName} ${emp.firstName} の権限とパスワードを保存しました。`;

      showAlert('success', successMsg);
    } catch (err: any) {
      showAlert('error', err.message || (isVi ? 'Đã xảy ra lỗi.' : isEn ? 'An error occurred.' : isZh ? '发生错误。' : isTh ? 'เกิดข้อผิดพลาดขึ้น' : 'エラーが発生しました。'));
    } finally {
      setLoadingRowId(null);
    }
  };

  const handleCancelEmployee = (id: string) => {
    setEditedValues(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Matrix actions
  const handleMatrixToggle = (role: string, permission: string) => {
    setRolePermissions(prev => {
      const current = prev[role] || [];
      const next = current.includes(permission)
        ? current.filter(p => p !== permission)
        : [...current, permission];
      return {
        ...prev,
        [role]: next,
      };
    });
    setMatrixChanged(true);
  };

  const handleSaveMatrix = async () => {
    setSavingMatrix(true);
    const isVi = t('roles.title').includes('Phân quyền');
    const isEn = t('roles.title').includes('Roles');
    const isZh = t('roles.title').includes('角色');
    const isTh = t('roles.title').includes('สิทธิ์');
    try {
      const promises = Object.entries(rolePermissions).map(([role, permissionsList]) =>
        fetch('/api/roles/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, permissions: permissionsList }),
        })
      );
      
      const results = await Promise.all(promises);
      const failed = results.find(r => !r.ok);
      if (failed) {
        throw new Error(isVi ? 'Không thể lưu một số thiết lập.' : isEn ? 'Failed to save some permission rules.' : isZh ? '部分权限保存失败。' : isTh ? 'บันทึกสิทธิ์การเข้าใช้งานบางส่วนไม่สำเร็จ' : '一部の権限設定の保存に失敗しました。');
      }
      
      setMatrixChanged(false);
      const successMsg = isVi
        ? 'Ma trận quyền đã được cập nhật thành công. Hiệu lực tức thì.'
        : isEn
        ? 'Permissions matrix updated successfully. Changes applied immediately.'
        : isZh
        ? '权限功能矩阵保存成功。最新设置已即时生效。'
        : isTh
        ? 'อัปเดตตารางสิทธิ์การใช้งานสำเร็จ การตั้งค่าใหม่จะมีผลในทันที'
        : '権限機能マトリクスを更新しました。新しい権限が即座に反映されます。';
      showAlert('success', successMsg);
    } catch (err: any) {
      showAlert('error', err.message || (isVi ? 'Đã xảy ra lỗi trong quá trình lưu.' : isEn ? 'Error occurred during save.' : isZh ? '保存过程中发生错误。' : isTh ? 'เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล' : '保存中にエラーが発生しました。'));
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleResetMatrix = () => {
    const initial: Record<string, string[]> = {
      SUPER_ADMIN: [],
      HR_MANAGER: [],
      DEPARTMENT_MANAGER: [],
      EMPLOYEE: [],
      VIEWER: [],
    };
    initialRolePermissions.forEach(rp => {
      if (initial[rp.role]) {
        initial[rp.role].push(rp.permission);
      }
    });
    setRolePermissions(initial);
    setMatrixChanged(false);
    const isVi = t('roles.title').includes('Phân quyền');
    const isEn = t('roles.title').includes('Roles');
    const isZh = t('roles.title').includes('角色');
    const isTh = t('roles.title').includes('สิทธิ์');
    const resetMsg = isVi
      ? 'Khôi phục ma trận quyền về trạng thái ban đầu.'
      : isEn
      ? 'Restored matrix to initial state.'
      : isZh
      ? '权限配置矩阵已恢复至初始状态。'
      : isTh
      ? 'รีเซ็ตตารางสิทธิ์การใช้งานกลับเป็นค่าเริ่มต้นเรียบร้อย'
      : '権限マトリクスを初期状態に戻しました。';
    showAlert('success', resetMsg);
  };

  // Add new permission logic
  const handleAddPermissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isVi = t('roles.title').includes('Phân quyền');
    const isEn = t('roles.title').includes('Roles');
    const isZh = t('roles.title').includes('角色');
    const isTh = t('roles.title').includes('สิทธิ์');

    if (!newPermission.key || !newPermission.name || !newPermission.category) {
      showAlert('error', isVi ? 'Vui lòng điền mã quyền, tên hiển thị và danh mục.' : isEn ? 'Key, display name and category are required.' : isZh ? '功能键名、显示名称以及分类是必填项。' : isTh ? 'กรุณาระบุคีย์สิทธิ์ ชื่อสิทธิ์ และหมวดหมู่' : 'キー、表示名、カテゴリは必須項目です。');
      return;
    }

    // Key Validation (lowercase and colons/dashes)
    const keyRegex = /^[a-z0-9_:-]+$/;
    if (!keyRegex.test(newPermission.key)) {
      showAlert('error', isVi ? 'Mã quyền chỉ chứa chữ thường, số, dấu hai chấm (:), gạch dưới (_) và gạch ngang (-).' : isEn ? 'Key must be lowercase letters, numbers, colons, underscores or dashes (e.g. training:edit).' : isZh ? '功能键名只能包含半角小写字母、数字、冒号(:)、下划线(_)以及连字符(-)（例如: training:edit）。' : isTh ? 'คีย์สิทธิ์ต้องประกอบด้วยตัวอักษรภาษาอังกฤษตัวพิมพ์เล็ก ตัวเลข เครื่องหมายทวิภาค (:) ขีดล่าง (_) หรือยัติภังค์ (-) เท่านั้น (เช่น training:edit)' : 'キーは半角小文字、数字、コロン(:)、アンダースコア(_)、ハイフン(-)のみ使用できます（例: training:edit）。');
      return;
    }

    setAddingPermission(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPermission),
      });

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.message || (isVi ? 'Không thể tạo mới quyền.' : isEn ? 'Failed to add permission key.' : isZh ? '添加权限功能失败。' : isTh ? 'เพิ่มคีย์สิทธิ์ใหม่ไม่สำเร็จ' : '権限機能の追加に失敗しました。'));
      }

      const created = await res.json();
      const createdPerm = created.data;

      // Update local permissions list state (sorted by category)
      setPermissions(prev => {
        const next = [...prev, createdPerm];
        return next.sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category);
          return a.key.localeCompare(b.key);
        });
      });

      // Default grant of this new permission to SUPER_ADMIN
      setRolePermissions(prev => {
        const adminPerms = prev.SUPER_ADMIN || [];
        return {
          ...prev,
          SUPER_ADMIN: [...adminPerms, createdPerm.key],
        };
      });
      setMatrixChanged(true);

      setShowAddPermissionModal(false);
      setNewPermission({ key: '', name: '', category: '', description: '' });
      const addedMsg = isVi
        ? `Đã thêm quyền mới "${createdPerm.name}" và tự động cấp cho Quản trị viên.`
        : isEn
        ? `Successfully registered new permission "${createdPerm.name}". Default granted to SUPER_ADMIN.`
        : isZh
        ? `已成功创建新权限「${createdPerm.name}」，已默认授予超级管理员。`
        : isTh
        ? `เพิ่มสิทธิ์ใหม่ "${createdPerm.name}" สำเร็จ โดยระบบกำหนดสิทธิ์การใช้งานให้ผู้ดูแลระบบสูงสุดโดยอัตโนมัติ`
        : `新規権限「${createdPerm.name}」を追加しました。管理者に初期付与されています。`;
      showAlert('success', addedMsg);
    } catch (err: any) {
      showAlert('error', err.message || (isVi ? 'Đã xảy ra lỗi.' : isEn ? 'An error occurred.' : isZh ? '发生错误。' : isTh ? 'เกิดข้อผิดพลาดขึ้น' : 'エラーが発生しました。'));
    } finally {
      setAddingPermission(false);
    }
  };

  const isVi = t('roles.title').includes('Phân quyền');
  const isEn = t('roles.title').includes('Roles');
  const isZh = t('roles.title').includes('角色');
  const isTh = t('roles.title').includes('สิทธิ์');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Alert Notification */}
      {alert && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn transition-all shadow-md ${
          alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-255' : 'bg-rose-50 text-rose-800 border-rose-255'
        }`}>
          <span className="text-lg">{alert.type === 'success' ? '✅' : '⚠️'}</span>
          <p className="text-xs font-bold">{alert.message}</p>
        </div>
      )}

      {/* Dynamic Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'accounts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {getTabLabel('accounts', t)}
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {getTabLabel('matrix', t)}
        </button>
      </div>

      {activeTab === 'accounts' && (
        <>
          {/* Control Card */}
          <Card className="">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="w-full md:max-w-md relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={isVi ? 'Tìm theo mã NV, họ tên, email, bộ phận...' : isEn ? 'Search by code, name, email, department...' : isZh ? '按工号、姓名、邮箱、部门搜索...' : isTh ? 'ค้นหาด้วยรหัส ชื่อ อีเมล หรือแผนก...' : '社員コード、氏名、メール、部署で検索...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-355 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                />
              </div>
              <div className="text-xs text-slate-450 font-semibold bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
                {isVi ? 'Mật khẩu tạm thời mặc định: ' : isEn ? 'Default temporary PW rule: ' : isZh ? '默认临时密码规则: ' : isTh ? 'รหัสผ่านเริ่มต้นระบบ: ' : 'デフォルトのログインPWルール: '}
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded border border-slate-300">
                  {isVi ? 'mã_nhân_viên + ngày_sinh_YYYYMMDD' : isEn ? 'employee_code + birthdate_YYYYMMDD' : isZh ? '工号 + 生日_YYYYMMDD' : isTh ? 'รหัสพนักงาน + วันเกิด_YYYYMMDD' : 'mã_nhân_viên + ngày_sinh_YYYYMMDD'}
                </span>
              </div>
            </div>
          </Card>

          {/* Accounts Table Card */}
          <Card title={isVi ? 'Danh sách tài khoản' : isEn ? 'Account List' : isZh ? '账号列表' : isTh ? 'รายชื่อผู้ใช้' : 'アカウント一覧'} action={
            <ExportButtons
              data={exportData}
              columns={[
                { header: isVi ? 'Mã NV' : isEn ? 'Code' : isZh ? '工号' : isTh ? 'รหัส' : 'コード', key: 'code' },
                { header: isVi ? 'Họ và tên' : isEn ? 'Full Name' : isZh ? '姓名' : isTh ? 'ชื่อ-นามสกุล' : '氏名', key: 'name' },
                { header: isVi ? 'Bộ phận' : isEn ? 'Department' : isZh ? '部门' : isTh ? 'แผนก' : '部署', key: 'department' },
                { header: isVi ? 'Chức vụ' : isEn ? 'Position' : isZh ? '职位' : isTh ? 'ตำแหน่ง' : '役職', key: 'position' },
                { header: isVi ? 'Tên đăng nhập (Email)' : isEn ? 'Login ID (Email)' : isZh ? '登录ID (Email)' : isTh ? 'บัญชีผู้ dùng (อีเมล)' : 'ログインID (Email)', key: 'email' },
                { header: isVi ? 'Quyền hệ thống (Role)' : isEn ? 'System Role' : isZh ? '系统角色' : isTh ? 'สิทธิ์ระบบ (Role)' : 'システム権限 (Role)', key: 'role' },
                { header: isVi ? 'Mật khẩu' : isEn ? 'Password' : isZh ? '密码' : isTh ? 'รหัสผ่าน' : 'パスワード', key: 'password' },
              ]}
              fileName="accounts_list"
            />
          } className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: '1000px' }}>
                <colgroup>
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '100px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-left text-xs text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-center">{isVi ? 'Mã NV' : isEn ? 'Code' : isZh ? '工号' : isTh ? 'รหัส' : 'コード'}</th>
                    <th className="px-5 py-3.5">{isVi ? 'Họ và tên' : isEn ? 'Full Name' : isZh ? '姓名' : isTh ? 'ชื่อ-นามสกุล' : '氏名'}</th>
                    <th className="px-5 py-3.5">{isVi ? 'Bộ phận / Chức vụ' : isEn ? 'Dept / Post' : isZh ? '部门 / 职位' : isTh ? 'แผนก / ตำแหน่ง' : '部署 / 役職'}</th>
                    <th className="px-5 py-3.5">{isVi ? 'Tên đăng nhập (Email)' : isEn ? 'Login ID (Email)' : isZh ? '登录ID (Email)' : isTh ? 'บัญชีผู้ใช้ (อีเมล)' : 'ログインID (Email)'}</th>
                    <th className="px-5 py-3.5">{isVi ? 'Mật khẩu đăng nhập' : isEn ? 'Password' : isZh ? '登录密码' : isTh ? 'รหัสผ่าน' : 'ログインパスワード'}</th>
                    <th className="px-5 py-3.5">{isVi ? 'Quyền hệ thống (Role)' : isEn ? 'System Role' : isZh ? '系统角色' : isTh ? 'สิทธิ์ระบบ (Role)' : 'システム権限 (Role)'}</th>
                    <th className="px-5 py-3.5 text-center">{isVi ? 'Thao tác' : isEn ? 'Actions' : isZh ? '操作' : isTh ? 'การจัดการ' : '操作'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400 bg-slate-50/20 font-bold">
                        {isVi ? 'Không tìm thấy tài khoản phù hợp.' : isEn ? 'No employees found matching search.' : isZh ? '未找到符合条件的在职员工账户。' : isTh ? 'ไม่พบข้อมูลบัญชีผู้ใช้งานที่ตรงเงื่อนไข' : '該当する従業員が見つかりません。'}
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => {
                      const edits = editedValues[emp.id];
                      const hasEdits = !!edits;
                      const currentRole = edits ? edits.role : emp.role;
                      const currentPassword = edits ? edits.password : emp.password;
                      
                      const isSaving = loadingRowId === emp.id;
                      const roleOption = roleOptions.find(o => o.value === currentRole);

                      return (
                        <tr key={emp.id} className={`hover:bg-slate-50/40 transition-colors ${hasEdits ? 'bg-blue-50/10' : ''}`}>
                          <td className="px-5 py-4 text-center font-mono text-xs font-bold text-blue-600">
                            {emp.employeeCode}
                          </td>
                          <td className="px-5 py-4">
                            <div>
                              <span className="font-bold text-slate-800 block">{emp.lastName} {emp.firstName}</span>
                              <span className="text-[10px] text-slate-400 font-semibold block">{emp.lastNameKana} {emp.firstNameKana}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 truncate">
                            <span className="text-xs font-semibold text-slate-600 block">{getDepartmentLabel(emp.department, t)}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{getPositionLabel(emp.position, t)}</span>
                          </td>
                          <td className="px-5 py-4 truncate font-medium text-slate-700">
                            {emp.email}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1.5">
                              <input
                                type="text"
                                value={currentPassword}
                                onChange={e => handlePasswordChange(emp.id, e.target.value)}
                                className={`w-full px-3 py-1.5 border rounded-lg text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                  hasEdits && edits.password !== emp.password ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'
                                }`}
                              />
                              <button
                                onClick={() => handleResetToDefault(emp)}
                                className="text-[10px] text-left text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer active:scale-95 transition-all self-start"
                                title={isVi ? 'Tự động tạo mật khẩu từ mã NV và ngày sinh' : 'Generates default password from DOB'}
                              >
                                {isVi ? 'Đặt về mặc định' : isEn ? 'Set Default' : isZh ? '恢复默认值' : isTh ? 'ใช้ค่าเริ่มต้น' : 'デフォルト値に設定'}
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1.5">
                              <select
                                value={currentRole}
                                onChange={e => handleRoleChange(emp.id, e.target.value)}
                                className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all ${
                                  hasEdits && edits.role !== emp.role ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200'
                                }`}
                              >
                                {roleOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border self-start ${roleOption?.color || ''}`}>
                                {isVi ? 'Quyền hiện tại' : isEn ? 'Current Role' : isZh ? '当前权限' : isTh ? 'สิทธิ์ปัจจุบัน' : '現在の権限'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {hasEdits ? (
                              <div className="flex flex-col gap-1.5 justify-center">
                                <button
                                  onClick={() => handleSaveEmployee(emp)}
                                  disabled={isSaving}
                                  className="w-full px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                  {isSaving ? '...' : (isVi ? 'Lưu' : isEn ? 'Save' : isZh ? '保存' : isTh ? 'บันทึก' : '保存')}
                                </button>
                                <button
                                  onClick={() => handleCancelEmployee(emp.id)}
                                  disabled={isSaving}
                                  className="w-full px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  {isVi ? 'Hủy' : isEn ? 'Revert' : isZh ? '撤销' : isTh ? 'ยกเลิก' : '戻す'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs font-semibold">{isVi ? 'Không thay đổi' : isEn ? 'No change' : isZh ? '无变更' : isTh ? 'ไม่มีการแก้ไข' : '変更なし'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Instructions and Control Header */}
          <Card className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {isVi ? 'Thiết lập Ma trận Phân quyền theo vai trò' : isEn ? 'Roles & Permissions Matrix Configuration' : isZh ? '角色与功能权限矩阵设置' : isTh ? 'ตั้งค่าตารางสิทธิ์การใช้งานแต่ละบทบาท' : '役割・機能権限マトリクス設定'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isVi ? 'Nhấp chọn để bật/tắt quyền truy cập các tính năng hoặc thao tác cho từng nhóm vai trò.' : isEn ? 'Toggle checkboxes to dynamically map access rights and functional permissions to each administrative role.' : isZh ? '通过勾选相应的复选框，可以动态配置各系统角色与功能操作的绑定关系。' : isTh ? 'เลือกช่องทำเครื่องหมายเพื่อจับคู่สิทธิ์การใช้งานแต่ละเมนูให้แก่กลุ่มบทบาทต่างๆ ในระบบ' : 'チェックボックスを選択して、システム内の各ロール（権限グループ）に機能を動的に関連付ける（紐づける）ことができます。'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <button
                  onClick={() => setShowAddPermissionModal(true)}
                  className="flex-1 lg:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold cursor-pointer transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1 shrink-0"
                >
                  {isVi ? '➕ Thêm quyền mới' : isEn ? '➕ Add Permission' : isZh ? '➕ 新增权限键' : isTh ? '➕ เพิ่มคีย์สิทธิ์ใหม่' : '➕ 新規権限追加'}
                </button>
                <button
                  onClick={handleResetMatrix}
                  disabled={!matrixChanged || savingMatrix}
                  className="flex-1 lg:flex-initial px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-40 transition-all active:scale-95 shrink-0"
                >
                  {isVi ? 'Hủy thay đổi' : isEn ? 'Discard' : isZh ? '放弃修改' : isTh ? 'ยกเลิก' : '変更を破棄'}
                </button>
                <button
                  onClick={handleSaveMatrix}
                  disabled={!matrixChanged || savingMatrix}
                  className="flex-1 lg:flex-initial px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer disabled:opacity-40 transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5 shrink-0"
                >
                  {savingMatrix ? '...' : `🔑 ${isVi ? 'Áp dụng & Lưu' : isEn ? 'Save Matrix' : isZh ? '反映并保存' : isTh ? 'บันทึกสิทธิ์' : '設定を反映・保存'}`}
                </button>
              </div>
            </div>
          </Card>

          {/* Matrix Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: '1000px' }}>
                <colgroup>
                  <col style={{ width: '300px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '140px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-center text-xs text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="px-5 py-4 text-left">{isVi ? 'Tính năng / Mô tả' : isEn ? 'Permission / Description' : isZh ? '权限名 / 说明' : isTh ? 'สิทธิ์การใช้งาน / คำอธิบาย' : '権限機能名 / 説明'}</th>
                    <th className="px-5 py-4 text-red-700 bg-red-50/20">{t('roles.roleSuperAdmin')}<br/><span className="text-[10px] font-mono font-bold">SUPER_ADMIN</span></th>
                    <th className="px-5 py-4 text-indigo-700 bg-indigo-50/20">{t('roles.roleAdmin')}<br/><span className="text-[10px] font-mono font-bold">HR_MANAGER</span></th>
                    <th className="px-5 py-4 text-blue-700 bg-blue-50/20">{t('roles.roleManager')}<br/><span className="text-[10px] font-mono font-bold">DEPT_MGR</span></th>
                    <th className="px-5 py-4 text-green-700 bg-green-50/20">{t('roles.roleEmployee')}<br/><span className="text-[10px] font-mono font-bold">EMPLOYEE</span></th>
                    <th className="px-5 py-4 text-slate-600 bg-slate-100/20">{isVi ? 'Chỉ xem' : isEn ? 'Viewer Only' : isZh ? '只读/查看' : isTh ? 'ดูอย่างเดียว' : '閲覧専用'}<br/><span className="text-[10px] font-mono font-bold">VIEWER</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permissions.map((permission, pIdx) => {
                    const isFirstInCategory = pIdx === 0 || permissions[pIdx - 1].category !== permission.category;
                    const translated = getPermissionTranslation(permission.key, permission.name, permission.description, t);

                    return (
                      <tr key={permission.key} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-5 py-4">
                          {isFirstInCategory && (
                            <span className="inline-block text-[10px] font-black tracking-wider uppercase bg-slate-100 border border-slate-250 text-slate-500 rounded px-1.5 py-0.5 mb-1.5">
                              {getCategoryLabel(permission.category, t)}
                            </span>
                          )}
                          <div className="font-bold text-slate-800 text-xs">{translated.name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">{translated.desc}</div>
                          <div className="text-[9px] text-slate-350 font-mono mt-1">{permission.key}</div>
                        </td>

                        {/* SUPER_ADMIN */}
                        <td className="px-5 py-4 text-center bg-red-50/5">
                          <input
                            type="checkbox"
                            checked={rolePermissions.SUPER_ADMIN.includes(permission.key)}
                            onChange={() => handleMatrixToggle('SUPER_ADMIN', permission.key)}
                            className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                          />
                        </td>

                        {/* HR_MANAGER */}
                        <td className="px-5 py-4 text-center bg-indigo-50/5">
                          <input
                            type="checkbox"
                            checked={rolePermissions.HR_MANAGER.includes(permission.key)}
                            onChange={() => handleMatrixToggle('HR_MANAGER', permission.key)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* DEPARTMENT_MANAGER */}
                        <td className="px-5 py-4 text-center bg-blue-50/5">
                          <input
                            type="checkbox"
                            checked={rolePermissions.DEPARTMENT_MANAGER.includes(permission.key)}
                            onChange={() => handleMatrixToggle('DEPARTMENT_MANAGER', permission.key)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* EMPLOYEE */}
                        <td className="px-5 py-4 text-center bg-green-50/5">
                          <input
                            type="checkbox"
                            checked={rolePermissions.EMPLOYEE.includes(permission.key)}
                            onChange={() => handleMatrixToggle('EMPLOYEE', permission.key)}
                            className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500 cursor-pointer"
                          />
                        </td>

                        {/* VIEWER */}
                        <td className="px-5 py-4 text-center bg-slate-50/5">
                          <input
                            type="checkbox"
                            checked={rolePermissions.VIEWER.includes(permission.key)}
                            onChange={() => handleMatrixToggle('VIEWER', permission.key)}
                            className="w-4 h-4 text-slate-600 border-slate-300 rounded focus:ring-slate-500 cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Add Permission Modal Dialog */}
      {showAddPermissionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-fadeIn" onClick={() => setShowAddPermissionModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800">
                {isVi ? '➕ Đăng ký mã quyền mới' : isEn ? '➕ Add Custom Permission Key' : isZh ? '➕ 新增系统权限功能键' : isTh ? '➕ เพิ่มคีย์สิทธิ์การใช้งานใหม่' : '➕ 新規権限機能キーの登録'}
              </h3>
              <button onClick={() => setShowAddPermissionModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold transition-colors cursor-pointer">&times;</button>
            </div>
            
            <form onSubmit={handleAddPermissionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-550 mb-1">
                  {isVi ? 'Mã quyền (Bắt buộc)' : isEn ? 'Permission Key (Required)' : isZh ? '功能键名 (必填)' : isTh ? 'คีย์สิทธิ์ (จำเป็น)' : '権限機能キー (必須)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. training:delete"
                  value={newPermission.key}
                  onChange={e => setNewPermission(prev => ({ ...prev, key: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {isVi ? '※ Chỉ chứa chữ thường, số, dấu hai chấm, gạch dưới và gạch ngang (ví dụ: training:delete)' : '※ Lowercase alphabets, numbers, colon, underscore, or dashes only.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-550 mb-1">
                  {isVi ? 'Tên quyền hiển thị (Bắt buộc)' : isEn ? 'Display Name (Required)' : isZh ? '功能显示名称 (必填)' : isTh ? 'ชื่อสิทธิ์แสดงผล (จำเป็น)' : '機能表示名 (必須)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delete Training Programs"
                  value={newPermission.name}
                  onChange={e => setNewPermission(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-550 mb-1">
                  {isVi ? 'Tên danh mục phân nhóm (Bắt buộc)' : isEn ? 'Category Name (Required)' : isZh ? '所属功能分类 (必填)' : isTh ? 'ชื่อหมวดหมู่ (จำเป็น)' : 'カテゴリ名 (必須)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Training"
                  value={newPermission.category}
                  onChange={e => setNewPermission(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-550 mb-1">
                  {isVi ? 'Mô tả quyền (Tùy chọn)' : isEn ? 'Description (Optional)' : isZh ? '功能详细说明 (选填)' : isTh ? 'คำอธิบายสิทธิ์ (เลือกระบุ)' : '機能の説明 (任意)'}
                </label>
                <textarea
                  placeholder="e.g. Allows complete removal of training courses from the DB."
                  value={newPermission.description}
                  onChange={e => setNewPermission(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none leading-relaxed bg-white"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPermissionModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-55 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
                >
                  {isVi ? 'Hủy' : isEn ? 'Cancel' : isZh ? '取消' : isTh ? 'ยกเลิก' : 'キャンセル'}
                </button>
                <button
                  type="submit"
                  disabled={addingPermission}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-1 shadow-md"
                >
                  {addingPermission ? '...' : (isVi ? 'Đăng ký' : isEn ? 'Register' : isZh ? '注册提交' : isTh ? 'ยืนยันลงทะเบียน' : '登録する')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
