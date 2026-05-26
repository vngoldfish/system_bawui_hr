'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';

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

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'システム管理者 (SUPER_ADMIN)', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'HR_MANAGER', label: '人事責任者 (HR_MANAGER)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'DEPARTMENT_MANAGER', label: '部門責任者 (DEPARTMENT_MANAGER)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'EMPLOYEE', label: '一般従業員 (EMPLOYEE)', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'VIEWER', label: '閲覧専用 (VIEWER)', color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

export default function RolesClient({ employees: initialEmployees, initialRolePermissions, initialPermissions }: RolesClientProps) {
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
    showAlert('success', `${emp.lastName} ${emp.firstName} のパスワード入力をデフォルト値「${defaultPass}」に設定しました（保存ボタンを押すと適用されます）`);
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
        throw new Error('変更の保存に失敗しました。');
      }

      setEmployees(prev =>
        prev.map(e => (e.id === emp.id ? { ...e, role: edits.role, password: edits.password } : e))
      );
      
      setEditedValues(prev => {
        const next = { ...prev };
        delete next[emp.id];
        return next;
      });

      showAlert('success', `${emp.lastName} ${emp.firstName} の権限とパスワードを保存しました。`);
    } catch (err: any) {
      showAlert('error', err.message || 'エラーが発生しました。');
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
    try {
      const promises = Object.entries(rolePermissions).map(([role, permissions]) =>
        fetch('/api/roles/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, permissions }),
        })
      );
      
      const results = await Promise.all(promises);
      const failed = results.find(r => !r.ok);
      if (failed) {
        throw new Error('一部の権限設定の保存に失敗しました。');
      }
      
      setMatrixChanged(false);
      showAlert('success', '権限機能マトリクスを更新しました。新しい権限が即座に反映されます。');
    } catch (err: any) {
      showAlert('error', err.message || '保存中にエラーが発生しました。');
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
    showAlert('success', '権限マトリクスを初期状態に戻しました。');
  };

  // Add new permission logic
  const handleAddPermissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPermission.key || !newPermission.name || !newPermission.category) {
      showAlert('error', 'キー、表示名、カテゴリは必須項目です。');
      return;
    }

    // Key Validation (lowercase and colons/dashes)
    const keyRegex = /^[a-z0-9_:-]+$/;
    if (!keyRegex.test(newPermission.key)) {
      showAlert('error', 'キーは半角小文字、数字、コロン(:)、アンダースコア(_)、ハイフン(-)のみ使用できます（例: training:edit）。');
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
        throw new Error(errBody.message || '権限機能の追加に失敗しました。');
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
      showAlert('success', `新規権限「${createdPerm.name}」を追加しました。管理者に初期付与されています。`);
    } catch (err: any) {
      showAlert('error', err.message || 'エラーが発生しました。');
    } finally {
      setAddingPermission(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Notification */}
      {alert && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fadeIn transition-all shadow-md ${
          alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span className="text-lg">{alert.type === 'success' ? '✅' : '⚠️'}</span>
          <p className="text-sm font-bold">{alert.message}</p>
        </div>
      )}

      {/* Dynamic Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'accounts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          👤 アカウント一覧・PW設定
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🔑 役割・機能権限マトリクス
        </button>
      </div>

      {activeTab === 'accounts' && (
        <>
          {/* Control Card */}
          <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="w-full md:max-w-md relative">
                <span className="absolute left-3 top-3.5 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="社員コード、氏名、メール、部署で検索..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-355 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                />
              </div>
              <div className="text-xs text-slate-450 font-semibold bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
                デフォルトのログインPWルール: <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded border border-slate-300">mã_nhân_viên + ngày_sinh_YYYYMMDD</span>
              </div>
            </div>
          </Card>

          {/* Accounts Table Card */}
          <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden p-0">
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
                    <th className="px-5 py-3.5 text-center">コード</th>
                    <th className="px-5 py-3.5">氏名</th>
                    <th className="px-5 py-3.5">部署 / 役職</th>
                    <th className="px-5 py-3.5">ログインID (Email)</th>
                    <th className="px-5 py-3.5">ログインパスワード</th>
                    <th className="px-5 py-3.5">システム権限 (Role)</th>
                    <th className="px-5 py-3.5 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400 bg-slate-50/20 font-bold">
                        該当する従業員が見つかりません。
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => {
                      const edits = editedValues[emp.id];
                      const hasEdits = !!edits;
                      const currentRole = edits ? edits.role : emp.role;
                      const currentPassword = edits ? edits.password : emp.password;
                      
                      const isSaving = loadingRowId === emp.id;
                      const roleOption = ROLE_OPTIONS.find(o => o.value === currentRole);

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
                            <span className="text-xs font-semibold text-slate-600 block">{emp.department}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{emp.position}</span>
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
                                title="生年月日を基にデフォルトのパスワードを生成します"
                              >
                                デフォルト値に設定
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
                                {ROLE_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border self-start ${roleOption?.color || ''}`}>
                                現在の権限
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
                                  {isSaving ? '...' : '保存'}
                                </button>
                                <button
                                  onClick={() => handleCancelEmployee(emp.id)}
                                  disabled={isSaving}
                                  className="w-full px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  戻す
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs font-semibold">変更なし</span>
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
          <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">役割・機能権限マトリクス設定</h3>
                <p className="text-xs text-slate-500 mt-1">
                  チェックボックスを選択して、システム内の各ロール（権限グループ）に機能を動的に関連付ける（紐づける）ことができます。
                </p>
              </div>
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <button
                  onClick={() => setShowAddPermissionModal(true)}
                  className="flex-1 lg:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold cursor-pointer transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1 shrink-0"
                >
                  ➕ 新規権限追加
                </button>
                <button
                  onClick={handleResetMatrix}
                  disabled={!matrixChanged || savingMatrix}
                  className="flex-1 lg:flex-initial px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-40 transition-all active:scale-95 shrink-0"
                >
                  変更を破棄
                </button>
                <button
                  onClick={handleSaveMatrix}
                  disabled={!matrixChanged || savingMatrix}
                  className="flex-1 lg:flex-initial px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold cursor-pointer disabled:opacity-40 transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5 shrink-0"
                >
                  {savingMatrix ? '保存中...' : '🔑 設定を反映・保存'}
                </button>
              </div>
            </div>
          </Card>

          {/* Matrix Table */}
          <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden p-0">
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
                    <th className="px-5 py-4 text-left">権限機能名 / 説明</th>
                    <th className="px-5 py-4 text-red-700 bg-red-50/20">システム管理者<br/><span className="text-[10px] font-mono font-bold">SUPER_ADMIN</span></th>
                    <th className="px-5 py-4 text-indigo-700 bg-indigo-50/20">人事責任者<br/><span className="text-[10px] font-mono font-bold">HR_MANAGER</span></th>
                    <th className="px-5 py-4 text-blue-700 bg-blue-50/20">部門責任者<br/><span className="text-[10px] font-mono font-bold">DEPT_MGR</span></th>
                    <th className="px-5 py-4 text-green-700 bg-green-50/20">一般従業員<br/><span className="text-[10px] font-mono font-bold">EMPLOYEE</span></th>
                    <th className="px-5 py-4 text-slate-600 bg-slate-100/20">閲覧専用<br/><span className="text-[10px] font-mono font-bold">VIEWER</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permissions.map((permission, pIdx) => {
                    const isFirstInCategory = pIdx === 0 || permissions[pIdx - 1].category !== permission.category;

                    return (
                      <tr key={permission.key} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-5 py-4">
                          {isFirstInCategory && (
                            <span className="inline-block text-[10px] font-black tracking-wider uppercase bg-slate-100 border border-slate-250 text-slate-500 rounded px-1.5 py-0.5 mb-1.5">
                              {permission.category}
                            </span>
                          )}
                          <div className="font-bold text-slate-800 text-xs">{permission.name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">{permission.description}</div>
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
              <h3 className="text-base font-black text-slate-800">➕ 新規権限機能キーの登録</h3>
              <button onClick={() => setShowAddPermissionModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold transition-colors cursor-pointer">&times;</button>
            </div>
            
            <form onSubmit={handleAddPermissionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-550 mb-1">権限機能キー (必須)</label>
                <input
                  type="text"
                  required
                  placeholder="例: training:delete"
                  value={newPermission.key}
                  onChange={e => setNewPermission(prev => ({ ...prev, key: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  ※ 半角英数字と「:」「-」「_」のみ（例: module:action）
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-550 mb-1">機能表示名 (必須)</label>
                <input
                  type="text"
                  required
                  placeholder="例: 研修プラン削除"
                  value={newPermission.name}
                  onChange={e => setNewPermission(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-550 mb-1">カテゴリ名 (必須)</label>
                <input
                  type="text"
                  required
                  placeholder="例: 研修管理 (Training)"
                  value={newPermission.category}
                  onChange={e => setNewPermission(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-550 mb-1">機能の説明 (任意)</label>
                <textarea
                  placeholder="例: 研修計画やカリキュラムをデータベースから完全に削除する権限。"
                  value={newPermission.description}
                  onChange={e => setNewPermission(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPermissionModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-55 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={addingPermission}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-1 shadow-md"
                >
                  {addingPermission ? '追加中...' : '登録する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
