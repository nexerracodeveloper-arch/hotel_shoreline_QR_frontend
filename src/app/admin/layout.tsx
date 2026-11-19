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
  QrCode,
} from 'lucide-react';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    // If no token exists, set demo token automatically so previewing admin is frictionless
    let token = getAuthToken();
    if (!token) {
      setAuthToken('demo-admin-token');
    }

    // Join admin socket channel
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
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

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
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors"
            >
              Public Home
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
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
