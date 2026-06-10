'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';
import Portal from '@/components/common/Portal';
import ExportButtons from '@/components/common/ExportButtons';
import GenericImportModal from '@/components/common/GenericImportModal';


interface Shiten {
  id: string;
  name: string;
  nameKana: string | null;
  address: string | null;
  phone: string | null;
  _count?: { employees: number };
  employees?: Employee[];
}

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  position?: { name: string } | string | any;
  status: string;
}

export default function ShitensClient({
  initialShitens = [],
}: {
  initialShitens?: Shiten[];
}) {
  const { t, locale } = useI18n();
  const [shitens, setShitens] = useState<Shiten[]>(initialShitens);
  const [selectedShiten, setSelectedShiten] = useState<Shiten | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  
  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingShiten, setEditingShiten] = useState<Shiten | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEmployeeIdsToAssign, setSelectedEmployeeIdsToAssign] = useState<string[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const exportData = useMemo(() => {
    return shitens.map(s => ({
      id: s.id,
      name: s.name,
      nameKana: s.nameKana || '',
      address: s.address || '',
      phone: s.phone || '',
      employeesCount: s._count?.employees || 0,
    }));
  }, [shitens]);

  
  // Form fields
  const [shitenForm, setShitenForm] = useState({
    name: '',
    nameKana: '',
    address: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchShitens = useCallback(async () => {
    try {
      const res = await fetch('/api/shitens');
      if (!res.ok) throw new Error('Failed to fetch branches');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
      setShitens(list);
      
      // Update selected shiten if it is currently selected
      if (selectedShiten) {
        const updated = list.find((s: Shiten) => s.id === selectedShiten.id);
        if (updated) {
          setSelectedShiten(updated);
          setEmployees(updated.employees || []);
        } else {
          setSelectedShiten(null);
          setEmployees([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  }, [selectedShiten]);

  const fetchAllEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?limit=1000');
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
      setAllEmployees(list);
    } catch (err) {
      console.error('Failed to fetch all employees:', err);
      setAllEmployees([]);
    }
  }, []);

  useEffect(() => {
    fetchShitens();
    fetchAllEmployees();
  }, [fetchShitens, fetchAllEmployees]);

  // Auto-select first branch on load if none selected
  useEffect(() => {
    if (shitens.length > 0 && !selectedShiten) {
      const first = shitens[0];
      setSelectedShiten(first);
      setEmployees(first.employees || []);
    }
  }, [shitens, selectedShiten]);

  const handleSelectShiten = (shiten: Shiten) => {
    setSelectedShiten(shiten);
    setEmployees(shiten.employees || []);
  };

  const handleOpenAdd = () => {
    setEditingShiten(null);
    setShitenForm({
      name: '',
      nameKana: '',
      address: '',
      phone: '',
    });
    setEditModalOpen(true);
  };

  const handleOpenEdit = (shiten: Shiten) => {
    setEditingShiten(shiten);
    setShitenForm({
      name: shiten.name,
      nameKana: shiten.nameKana || '',
      address: shiten.address || '',
      phone: shiten.phone || '',
    });
    setEditModalOpen(true);
  };

  const handleDeleteShiten = async (shiten: Shiten) => {
    if (shiten._count && shiten._count.employees > 0) {
      alert(t('shitens.deleteErrorEmployees'));
      return;
    }
    if (!confirm(`${shiten.name}を削除してよろしいですか？`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/shitens/${shiten.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || 'Failed to delete');
      }
      alert(t('shitens.deleteSuccess'));
      await fetchShitens();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShiten = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingShiten ? `/api/shitens/${editingShiten.id}` : '/api/shitens';
      const method = editingShiten ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: shitenForm.name,
          nameKana: shitenForm.nameKana || null,
          address: shitenForm.address || null,
          phone: shitenForm.phone || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || 'Failed to save');
      }

      alert(t('shitens.saveSuccess'));
      setEditModalOpen(false);
      await fetchShitens();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmployee = async (empId: string) => {
    if (!selectedShiten) return;
    if (!confirm('この支店から従業員を配属解除しますか？')) return;

    const remainingEmployeeIds = employees
      .filter(e => e.id !== empId)
      .map(e => e.id);

    setLoading(true);
    try {
      const res = await fetch(`/api/shitens/${selectedShiten.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: remainingEmployeeIds,
        }),
      });
      if (!res.ok) throw new Error('Unassignment failed');
      await fetchShitens();
    } catch (err) {
      console.error(err);
      alert('Failed to remove employee');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssign = () => {
    setSelectedEmployeeIdsToAssign([]);
    setAssignModalOpen(true);
  };

  const handleAssignEmployees = async () => {
    if (!selectedShiten) return;
    const currentIds = employees.map(e => e.id);
    const newIds = [...currentIds, ...selectedEmployeeIdsToAssign];

    setLoading(true);
    try {
      const res = await fetch(`/api/shitens/${selectedShiten.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: newIds,
        }),
      });
      if (!res.ok) throw new Error('Assignment failed');
      setAssignModalOpen(false);
      await fetchShitens();
    } catch (err) {
      console.error(err);
      alert('Failed to assign employees');
    } finally {
      setLoading(false);
    }
  };

  // Employees available to assign (not already in the branch)
  const assignableEmployees = useMemo(() => {
    const currentIds = employees.map(e => e.id);
    return allEmployees.filter(e => !currentIds.includes(e.id));
  }, [allEmployees, employees]);

  const filteredEmployeesList = useMemo(() => {
    if (!searchTerm) return assignableEmployees;
    const term = searchTerm.toLowerCase();
    return assignableEmployees.filter(e =>
      `${e.lastName} ${e.firstName}`.toLowerCase().includes(term) ||
      e.employeeCode.toLowerCase().includes(term)
    );
  }, [assignableEmployees, searchTerm]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Stat Board - Redesigned to look extremely premium */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('shitens.title') || 'Branches'}</h2>
          <p className="text-xl font-black text-slate-800 mt-1">
            {(t('shitens.activeBranchesCount') || '{count} branches').replace('{count}', String(shitens.length))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center self-start sm:self-center">
          <ExportButtons
            data={exportData}
            columns={[
              { header: 'ID', key: 'id' },
              { header: t('shitens.labelName') || 'Name', key: 'name' },
              { header: (t('shitens.labelName') || 'Name') + ' (Kana)', key: 'nameKana' },
              { header: t('shitens.labelAddress') || 'Address', key: 'address' },
              { header: t('shitens.labelPhone') || 'Phone', key: 'phone' },
              { header: t('shitens.colEmployeesCount') || 'Employees Count', key: 'employeesCount' },
            ]}
            fileName="branches_list"
          />
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-4.5 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:shadow-md"
          >
            📥 {t('common.import') || 'Import'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side: Branch Cards grid */}
        <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('shitens.title')}</h2>
          <button
            onClick={handleOpenAdd}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow transition-colors"
          >
            <span>+</span> {t('common.add')}
          </button>
        </div>

        <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          {shitens.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">{t('shitens.noShiten')}</p>
          ) : (
            shitens.map((shiten) => {
              const isSelected = selectedShiten?.id === shiten.id;
              return (
                <div
                  key={shiten.id}
                  onClick={() => handleSelectShiten(shiten)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-indigo-200 shadow-md ring-1 ring-indigo-300/30'
                      : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📍</span>
                        <h3 className="font-bold text-slate-800 text-sm md:text-base">{shiten.name}</h3>
                      </div>
                      {shiten.nameKana && (
                        <p className="text-xxs text-slate-400 mt-0.5 ml-7">{shiten.nameKana}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(shiten);
                        }}
                        className="p-1 hover:bg-indigo-100 rounded text-slate-500 hover:text-indigo-600 transition-colors"
                        title={t('common.edit')}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteShiten(shiten);
                        }}
                        className="p-1 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-colors"
                        title={t('common.delete')}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 ml-7 text-xs text-slate-600">
                    <div className="flex items-center justify-between text-[10px] bg-slate-100/80 px-2 py-0.5 rounded text-slate-500 font-mono mb-2">
                      <span className="truncate">ID: {shiten.id}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(shiten.id);
                          alert('Branch ID copied!');
                        }}
                        className="hover:text-indigo-600 transition-colors font-bold ml-1 cursor-pointer"
                        title="Copy Branch ID"
                      >
                        📋
                      </button>
                    </div>
                    {shiten.phone && <p>📞 {shiten.phone}</p>}
                    {shiten.address && <p>🏠 {shiten.address}</p>}
                    <p className="mt-2 text-xxs inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      👥 {shiten._count?.employees || 0} {t('common.personUnit')}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right side: Assigned Employees list */}
      <div className="lg:col-span-2">
        {selectedShiten ? (
          <Card>
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{selectedShiten.name}</h2>
                <p className="text-xs text-slate-500">{selectedShiten.address || '住所登録なし'}</p>
              </div>
              <button
                onClick={handleOpenAssign}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow transition-colors"
              >
                👥 {t('shitens.assignBtn')}
              </button>
            </div>

            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t('shitens.assignedEmployees')}
            </h3>

            {employees.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <p className="text-sm text-slate-500">{t('shitens.noEmployees')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 border-collapse" style={{ minWidth: '540px' }}>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium text-xs uppercase">
                      <th className="py-2.5 px-4">{t('shitens.colCode')}</th>
                      <th className="py-2.5 px-4">{t('shitens.colName')}</th>
                      <th className="py-2.5 px-4">{t('shitens.colPos')}</th>
                      <th className="py-2.5 px-4">{t('shitens.colStatus')}</th>
                      <th className="py-2.5 px-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp) => {
                      const posName = typeof emp.position === 'object' ? emp.position?.name : emp.position;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs">{emp.employeeCode}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {emp.lastName} {emp.firstName}
                          </td>
                          <td className="py-3 px-4 text-xs">{posName || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xxs font-medium ${
                              emp.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : emp.status === 'ON_LEAVE'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleRemoveEmployee(emp.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs transition-colors"
                            >
                              {t('shitens.removeBtn')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
            <span className="text-4xl mb-3">🏢</span>
            <p className="text-slate-500 text-sm">{t('shitens.noShiten')}</p>
          </div>
        )}
      </div>

      {/* Add / Edit Branch Modal */}
      {editModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setEditModalOpen(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-800">
                  {editingShiten ? t('shitens.editTitle') : t('shitens.addTitle')}
                </h3>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveShiten} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('shitens.labelName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={shitenForm.name}
                    onChange={(e) => setShitenForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="東京本社"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('shitens.labelKana')}
                  </label>
                  <input
                    type="text"
                    value={shitenForm.nameKana}
                    onChange={(e) => setShitenForm(prev => ({ ...prev, nameKana: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="トウキョウホンシャ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('shitens.labelPhone')}
                  </label>
                  <input
                    type="tel"
                    value={shitenForm.phone}
                    onChange={(e) => setShitenForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="03-1234-5678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('shitens.labelAddress')}
                  </label>
                  <input
                    type="text"
                    value={shitenForm.address}
                    onChange={(e) => setShitenForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="東京都千代田区1-1"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                  >
                    {t('form.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:shadow disabled:opacity-50"
                  >
                    {t('form.update')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Assign Employees Modal */}
      {assignModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setAssignModalOpen(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-800">{t('shitens.selectEmployees')}</h3>
                <button
                  onClick={() => setAssignModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="名前または社員コードで検索"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                  {filteredEmployeesList.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">配属可能な従業員はいません</p>
                  ) : (
                    filteredEmployeesList.map((emp) => {
                      const isChecked = selectedEmployeeIdsToAssign.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmployeeIdsToAssign(prev => [...prev, emp.id]);
                              } else {
                                setSelectedEmployeeIdsToAssign(prev => prev.filter(id => id !== emp.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="text-xs">
                            <span className="font-mono text-slate-400 mr-2">[{emp.employeeCode}]</span>
                            <span className="font-bold text-slate-800">{emp.lastName} {emp.firstName}</span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                  >
                    {t('form.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignEmployees}
                    disabled={selectedEmployeeIdsToAssign.length === 0 || loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                  >
                    {t('shitens.assignBtn')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <GenericImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchShitens}
        apiPath="/api/shitens/import"
        payloadKey="shitens"
        templateJson={JSON.stringify([
          {
            name: "東京本社",
            nameKana: "トウキョウホンシャ",
            address: "東京都千代田区1-1",
            phone: "03-1234-5678"
          },
          {
            name: "大阪支店",
            nameKana: "オオサカシテン",
            address: "大阪府大阪市北区2-2",
            phone: "06-9876-5432"
          }
        ], null, 2)}
        title={t('common.importBranches') || 'Import Branches'}
        description={t('common.importBranchesDesc') || 'Upload a JSON file containing a list of branches to import them all at once.'}
      />
    </div>
  </div>
);
}
