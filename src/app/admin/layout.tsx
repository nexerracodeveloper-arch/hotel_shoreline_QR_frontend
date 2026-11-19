'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Hotel,
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  UtensilsCrossed,
  BellRing,
  BookOpen,
  LogOut,
  Radio,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { clearAuthToken, getAuthToken, api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const token = getAuthToken();

    // If no token exists, immediately redirect to login page
    if (!token || token === 'demo-admin-token') {
      clearAuthToken();
      router.replace('/');
      return;
    }

    // Verify token validity with backend API
    api.auth
      .getMe()
      .then((res) => {
        if (res.success && res.user) {
          setIsAuthenticated(true);
          setCurrentUser(res.user);
        } else {
          clearAuthToken();
          router.replace('/');
        }
      })
      .catch(() => {
        clearAuthToken();
        router.replace('/');
      });

    // Join admin realtime channel
    const socket = getSocket();
    socket.emit('join:admin');

    const handleConnect = () => setIsSocketConnected(true);
    const handleDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    setIsSocketConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [router]);

  const handleLogout = () => {
    clearAuthToken();
    router.replace('/');
  };

  // If verifying authentication, show secure loading barrier
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl mb-4">
          <ShieldCheck className="w-8 h-8 mx-auto" />
        </div>
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin mb-3" />
        <h2 className="text-sm font-bold text-white">Verifying Staff Authorization</h2>
        <p className="text-xs text-slate-500 mt-1">Direct access requires authenticated staff credentials.</p>
      </div>
    );
  }

  const navLinks = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/rooms', label: 'Rooms & QR Studio', icon: BedDouble },
    { href: '/admin/bookings', label: 'Bookings & Check-In', icon: CalendarCheck },
    { href: '/admin/orders', label: 'Live Room Orders', icon: UtensilsCrossed },
    { href: '/admin/requests', label: 'Service Desk', icon: BellRing },
    { href: '/admin/menu', label: 'Menu Catalog', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Admin Nav */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/admin" className="flex items-center space-x-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                <Hotel className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base text-white tracking-tight block leading-tight">
                  Grand Azure
                </span>
                <span className="text-[10px] text-amber-400 font-semibold tracking-widest uppercase">
                  Operations Command
                </span>
              </div>
            </Link>

            {/* Socket Status Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300">
              <Radio
                className={`w-3 h-3 ${
                  isSocketConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
                }`}
              />
              <span>{isSocketConnected ? 'Realtime Connected' : 'Sync Active'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {currentUser && (
              <span className="text-xs text-slate-400 hidden sm:inline">
                Signed in as <strong className="text-amber-300">{currentUser.name}</strong>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700/70 transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Sub-Nav Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto scrollbar-none py-1.5 border-t border-slate-800/60">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
