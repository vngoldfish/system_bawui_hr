'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error('Unhandled Global Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6.5 font-sans">
      <div className="relative bg-white/80 backdrop-blur-md rounded-3xl border border-rose-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-lg mx-auto p-8 text-center animate-fadeIn overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 to-amber-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Icon */}
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-200/50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h1 className="text-xl font-black text-slate-850 tracking-tight mb-2">{t('errorBoundary.title')}</h1>
        <p className="text-sm text-slate-500 font-semibold mb-6">
          {t('errorBoundary.description')}
        </p>

        {/* Detailed error box */}
        <div className="bg-slate-55/60 border border-slate-200/60 rounded-2xl p-4.5 mb-6 text-left max-h-[140px] overflow-y-auto">
          <p className="text-xs font-mono font-bold text-rose-700 break-all">{error.message || 'Unknown system error'}</p>
          {error.digest && (
            <p className="text-[10px] font-mono text-slate-400 font-semibold mt-1">Error Digest: {error.digest}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            {t('errorBoundary.retry')}
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-2.5 border border-slate-250 hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-bold transition-all text-center"
          >
            {t('errorBoundary.backDashboard')}
          </Link>
        </div>
      </div>
    </div>
  );
}
