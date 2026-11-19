'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hotel, Lock, Mail, ArrowRight, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, getAuthToken, setAuthToken } from '@/lib/api';

export default function RootLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@hotel.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // If already logged in with a valid token, navigate directly to /admin
  useEffect(() => {
    const token = getAuthToken();
    if (token && token !== 'demo-admin-token') {
      api.auth
        .getMe()
        .then((res) => {
          if (res.success && res.user) {
            router.replace('/admin');
          } else {
            setCheckingAuth(false);
          }
        })
        .catch(() => {
          setCheckingAuth(false);
        });
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      const res = await api.auth.login({ email, password });
      if (res.success && res.token) {
        setAuthToken(res.token);
        toast.success(`Welcome back, ${res.user.name}!`);
        router.push('/admin');
      } else {
        toast.error(res.error || 'Authentication failed. Please check credentials.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('admin@hotel.com');
    setPassword('admin123');
    setTimeout(() => {
      handleSubmit();
    }, 50);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
        <p className="text-xs text-slate-500">Checking authorization...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 selection:bg-amber-100 selection:text-amber-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl mb-4 shadow-lg shadow-amber-500/10">
          <Hotel className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Hotel Operations Portal
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Protected platform. Please sign in with authorized hotel staff credentials to proceed.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-sm space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hotel.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Staff Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In to Hotel Management</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="pt-4 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Click Demo Sign In (General Manager)</span>
            </button>
            <p className="text-[11px] text-slate-500 mt-2">
              Default access: <code>admin@hotel.com</code> / <code>admin123</code>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          &copy; {new Date().getFullYear()} Hotel Shoreline Luxury Resort & Suites. All operations restricted to authorized staff.
        </p>
      </div>
    </div>
  );
}
