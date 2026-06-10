'use client';

import { useState, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import IdLookupPanel from './IdLookupPanel';

interface GenericImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiPath: string;
  templateJson: string;
  payloadKey?: string;
  title: string;
  description: string;
}

export default function GenericImportModal({
  isOpen,
  onClose,
  onSuccess,
  apiPath,
  templateJson,
  payloadKey = 'data',
  title,
  description
}: GenericImportModalProps) {
  const { t } = useI18n();
  const [jsonText, setJsonText] = useState('');
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(templateJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateJson = (text: string): boolean => {
    if (!text.trim()) {
      setSyntaxError(null);
      return false;
    }
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setSyntaxError(t('client.importJsonRequiredArray') || 'JSON must be an array of objects');
        return false;
      }
      setSyntaxError(null);
      return true;
    } catch (e: any) {
      setSyntaxError(`${t('client.importJsonInvalidFormat') || 'Invalid JSON format'} (${e.message})`);
      return false;
    }
  };

  const handleTextChange = (text: string) => {
    setJsonText(text);
    validateJson(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonText(text);
      validateJson(text);
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerErrors([]);
    setSuccessMessage(null);

    const isValid = validateJson(jsonText);
    if (!isValid) return;

    setLoading(true);

    try {
      const dataArray = JSON.parse(jsonText);
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [payloadKey]: dataArray }),
      });

      const body = await res.json();

      if (!res.ok) {
        if (body.details && Array.isArray(body.details)) {
          setServerErrors(body.details);
        } else {
          setServerErrors([body.error || 'Import failed']);
        }
      } else {
        const successMsg = `Successfully imported ${body.data?.count || dataArray.length} items.`;
        setSuccessMessage(successMsg);
        setJsonText('');
        onSuccess();
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setServerErrors([err.message || 'Network error']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60 animate-fadeIn">
      <div className={`bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl w-full border border-slate-150/80 dark:border-slate-800 flex flex-col max-h-[90vh] animate-scaleUp text-slate-800 dark:text-slate-100 transition-all duration-300 ${
        showLookup ? 'max-w-5xl' : 'max-w-2xl'
      }`}>
        
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4 mb-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-100 tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {description}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Outer Split Wrapper */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-0">
          
          {/* Main Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 flex flex-col min-h-0">
            {/* File Upload & Copy Template Actions */}
            <div className="flex flex-wrap gap-2 justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <label className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold shadow-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload JSON File
                  <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef}
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLookup(!showLookup)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    showLookup
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  🆔 {showLookup ? 'Hide ID Lookup' : 'ID Lookup'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyTemplate}
                  className="px-3.5 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  {copied ? 'Copied!' : 'Copy Template'}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 flex flex-col flex-1 min-h-0">
              {/* JSON Textarea */}
              <div className="flex-1 min-h-0">
                <textarea
                  value={jsonText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={templateJson}
                  className="w-full h-full min-h-[200px] p-4 border border-slate-250 dark:border-slate-700 rounded-2xl text-xs font-mono bg-slate-900 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>

              {/* Error & Success banners */}
              {syntaxError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs font-bold animate-fadeIn flex-shrink-0">
                  ⚠️ {syntaxError}
                </div>
              )}

              {serverErrors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs font-bold animate-fadeIn space-y-2 flex-shrink-0">
                  <p className="font-extrabold text-sm border-b border-rose-200 pb-1">
                    ⚠️ Import validation errors:
                  </p>
                  <div className="max-h-[120px] overflow-y-auto space-y-1 font-semibold pr-1">
                    {serverErrors.map((err, idx) => (
                      <p key={idx} className="pl-2 border-l-2 border-rose-400">{err}</p>
                    ))}
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-black animate-scaleUp text-center flex items-center justify-center gap-2 flex-shrink-0">
                  <span className="text-lg">✅</span>
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t pt-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-350 dark:hover:bg-slate-800 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer transition-all active:scale-98"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading || !jsonText.trim() || !!syntaxError}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {loading && (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {loading ? 'Importing...' : 'Execute Import'}
                </button>
              </div>
            </form>
          </div>

          {/* Lookup Helper Side Panel */}
          {showLookup && (
            <div className="w-full md:w-80 flex-shrink-0 flex flex-col min-h-0 border-l border-slate-100 dark:border-slate-800 pl-0 md:pl-6">
              <IdLookupPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
