'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Clear session user cookie on load to ensure a clean state
    document.cookie = 'session_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('すべてのフィールドを入力してください。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.message || 'ログインに失敗しました。');
      }

      // Successful login - redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'ログインエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo Icon */}
        <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black font-mono shadow-lg mx-auto border border-blue-500/25">
          HR
        </div>
        <h2 className="mt-5 text-3xl font-extrabold text-slate-800 tracking-tight">
          HR Management
        </h2>
        <p className="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          人事管理システム
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200/80 shadow-2xl rounded-3xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-bold animate-fadeIn">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-550 mb-1">
                メールアドレス (Email)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="taro.yamada@company.jp"
                className="w-full px-4 py-3 border border-slate-250 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-550 mb-1">
                パスワード (Password)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-slate-250 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer transition-all active:scale-98"
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
            </div>
          </form>

          {/* Credentials Helper Panel */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-1.5 leading-relaxed text-slate-500">
              <div className="font-bold text-slate-700 mb-1">💡 ログインヘルプ (Demo account hint):</div>
              <p>• <b>山田 太郎</b>: taro.yamada@company.jp / NV00119920315</p>
              <p>• <b>佐藤 花子</b>: hanako.sato@company.jp / NV00219900620</p>
              <p>• <b>高橋 健太</b>: kenta.takahashi@company.jp / NV00319881105 (人事責任者)</p>
              <p>• <b>小林 由美</b>: yumi.kobayashi@company.jp / NV00819850612 (システム管理者)</p>
              <p className="text-[10px] text-slate-400 mt-2">
                ※ パスワードの初期設定ルール: <code>社員コード + 生年月日(YYYYMMDD)</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
