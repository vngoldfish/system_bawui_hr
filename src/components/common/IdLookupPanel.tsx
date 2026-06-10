'use client';

import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';

interface LookupItem {
  id: string;
  name: string;
  extra?: string;
}

export default function IdLookupPanel() {
  const { t } = useI18n();
  const [resource, setResource] = useState<'departments' | 'positions' | 'contract-types' | 'shitens' | 'employees'>('departments');
  const [items, setItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const endpoint = `/api/${resource}${resource === 'employees' ? '?limit=1000' : ''}`;
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        
        let list: any[] = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && Array.isArray(data.data)) {
          list = data.data;
        }

        const mapped: LookupItem[] = list.map((item: any) => {
          if (resource === 'employees') {
            return {
              id: item.id,
              name: `${item.lastName} ${item.firstName}`,
              extra: item.employeeCode ? `[${item.employeeCode}]` : undefined,
            };
          }
          return {
            id: item.id,
            name: item.name,
            extra: item.nameKana ? `(${item.nameKana})` : undefined,
          };
        });

        setItems(mapped);
      } catch (err) {
        console.error(err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resource]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.extra && item.extra.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col h-full min-h-[350px]">
      <div className="mb-3">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          🆔 {t('common.idLookup') || 'ID Reference Lookup'}
        </h4>
        <p className="text-[10px] text-slate-450 mb-3">
          {t('common.idLookupDesc') || 'Search and copy IDs to use in your JSON import payload.'}
        </p>
        
        {/* Selector */}
        <select
          value={resource}
          onChange={(e) => {
            setResource(e.target.value as any);
            setSearchQuery('');
          }}
          className="w-full px-3 py-2 border border-slate-250 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 font-bold outline-none cursor-pointer mb-2.5"
        >
          <option value="departments">🏢 {t('nav.departments') || 'Departments'}</option>
          <option value="positions">💼 {t('nav.positions') || 'Positions'}</option>
          <option value="contract-types">📄 {t('nav.contractTypes') || 'Contract Types'}</option>
          <option value="shitens">📍 {t('nav.shitens') || 'Branches'}</option>
          <option value="employees">👥 {t('nav.employees') || 'Employees'}</option>
        </select>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder={t('common.searchPlaceholder') || 'Search by name or ID...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-250 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 outline-none"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* List container */}
      <div className="flex-1 overflow-y-auto max-h-[300px] border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-center py-6 text-slate-400 text-xs">
            {t('common.noRecordsFound') || 'No items found'}
          </p>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all text-xs"
            >
              <div className="min-w-0 pr-2">
                <p className="font-bold text-slate-850 dark:text-slate-200 truncate">
                  {item.name} {item.extra && <span className="text-[10px] text-slate-400 font-semibold">{item.extra}</span>}
                </p>
                <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 select-all truncate mt-0.5">
                  {item.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(item.id)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all flex-shrink-0 cursor-pointer ${
                  copiedId === item.id
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {copiedId === item.id ? '✓' : 'Copy'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
