'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hotel, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, setAuthToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
        if (res.user.role === 'KITCHEN_STAFF' || res.user.email?.toLowerCase().includes('order')) {
          router.push('/admin/order-desk');
        } else {
          router.push('/admin');
        }
      } else {
        toast.error(res.error || 'Authentication failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (selectedRole: 'orders' | 'admin') => {
    if (selectedRole === 'orders') {
      setEmail('orders@hotel.com');
      setPassword('order123');
    } else {
      setEmail('admin@hotel.com');
      setPassword('admin123');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-block p-1 bg-gradient-to-br from-[#dfba73] via-[#b88e44] to-[#8c6527] rounded-3xl mb-4 shadow-2xl shadow-black/60">
          <img
            src="/logo.png"
            alt="Hotel Shoreline Vista"
            className="h-24 sm:h-28 w-auto object-contain rounded-2xl mx-auto"
          />
        </div>
        <h2 className="text-xl sm:text-2xl font-cinzel font-bold text-white tracking-wider uppercase">
          Hotel Operations Portal
        </h2>
        <p className="mt-1.5 text-xs text-amber-400 font-semibold tracking-wide">
          Waves Multicuisine & Bar • Authorized Staff Access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-sm space-y-6">
          {/* Quick Staff Login Preset Selector */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
              Select Staff Login Mode:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => handleSelectRole('orders')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                  email === 'orders@hotel.com'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Room Orders Desk</span>
                <span className="text-[9px] opacity-80 font-normal">Order Details & Rooms</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('admin')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                  email === 'admin@hotel.com'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Master Admin</span>
                <span className="text-[9px] opacity-80 font-normal">Full Operations</span>
              </button>
            </div>
          </div>

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
                  placeholder="Enter staff email address"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Password
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
                  <span>Sign In to Admin Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
