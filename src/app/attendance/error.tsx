'use client';

import { useEffect } from 'react';

export default function AttendanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Attendance Module Error:', error);
  }, [error]);

  return (
    <div className="bg-white/80 border border-rose-100 rounded-3xl p-8 text-center animate-fadeIn shadow-sm max-w-lg mx-auto my-12">
      <div className="w-14 h-14 bg-rose-50 border border-rose-150 rounded-2xl flex items-center justify-center mx-auto mb-4.5">
        <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>

      <h2 className="text-base font-black text-slate-800 tracking-tight">勤怠データの読み込みエラー</h2>
      <p className="text-xs text-slate-500 font-semibold mt-1.5 mb-5">
        出退勤ログまたはカレンダー情報の取得中にエラーが発生しました。
      </p>

      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-left mb-5 font-mono text-[11px] text-rose-700 overflow-x-auto">
        {error.message || 'Unknown attendance module error'}
      </div>

      <button
        onClick={() => reset()}
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
      >
        再試行
      </button>
    </div>
  );
}
