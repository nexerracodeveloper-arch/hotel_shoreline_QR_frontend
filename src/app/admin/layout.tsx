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
  Menu as MenuIcon,
  X,
  ChevronRight,
  User,
  MoreHorizontal,
} from 'lucide-react';
import { clearAuthToken, getAuthToken, api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
    { href: '/admin/orders', label: 'Live Orders', icon: UtensilsCrossed },
    { href: '/admin/rooms', label: 'Rooms & QR Studio', icon: BedDouble },
    { href: '/admin/menu', label: 'Menu Catalog', icon: BookOpen },
    { href: '/admin/bookings', label: 'Bookings & Check-In', icon: CalendarCheck },
    { href: '/admin/requests', label: 'Service Desk', icon: BellRing },
  ];

  // Mobile Bottom Navigation Bar primary 4 tabs
  const mobileBottomTabs = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Orders', icon: UtensilsCrossed },
    { href: '/admin/rooms', label: 'Rooms', icon: BedDouble },
    { href: '/admin/menu', label: 'Menu', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500/30">
      {/* Top Admin Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/admin" className="flex items-center space-x-2.5">
              <div className="p-1.5 sm:p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                <Hotel className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base text-white tracking-tight block leading-tight">
                  Grand Azure
                </span>
                <span className="text-[9px] sm:text-[10px] text-amber-400 font-semibold tracking-wider uppercase">
                  Operations Command
                </span>
              </div>
            </Link>

            {/* Socket Status Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-[11px] text-slate-300">
              <Radio
                className={`w-3 h-3 ${
                  isSocketConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
                }`}
              />
              <span>{isSocketConnected ? 'Realtime Connected' : 'Sync Active'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Socket Dot for Mobile */}
            <div className="sm:hidden flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSocketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>Live</span>
            </div>

            {currentUser && (
              <span className="text-xs text-slate-400 hidden lg:inline">
                Signed in as <strong className="text-amber-300">{currentUser.name}</strong>
              </span>
            )}

            {/* Desktop Sign Out */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700/70 transition-all cursor-pointer items-center space-x-1.5 text-xs font-semibold"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              aria-label="Open Navigation Menu"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Desktop & Tablet Sub-Nav Tabs (hidden on phones) */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-x-1 overflow-x-auto scrollbar-none py-1.5 border-t border-slate-800/60">
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

      {/* Main Container - with safe bottom padding for mobile navigation */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* ================================================================ */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Phones only, md:hidden)             */}
      {/* ================================================================ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-[env(safe-area-inset-bottom,0px)] shadow-2xl">
        <div className="grid grid-cols-5 h-15 items-center px-1">
          {mobileBottomTabs.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 transition-all ${
                  isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? 'bg-amber-500/15 scale-105' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          })}

          {/* 5th Tab: "More" trigger to open full drawer */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              pathname === '/admin/bookings' || pathname === '/admin/requests'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-xl ${
                pathname === '/admin/bookings' || pathname === '/admin/requests'
                  ? 'bg-amber-500/15'
                  : ''
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* ================================================================ */}
      {/* MOBILE SLIDE-OUT DRAWER / MODAL                                   */}
      {/* ================================================================ */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-slate-900 border-l border-slate-800 h-full p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                    <Hotel className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Grand Azure</h3>
                    <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                      Staff Portal
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Staff Profile Card */}
              {currentUser && (
                <div className="mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-sm">
                    {currentUser.name?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <div className="mt-5 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
                  Navigation
                </div>
                {navLinks.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Bottom Section: Realtime Status & Logout */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
                <span>Realtime Engine</span>
                <span className="flex items-center space-x-1 font-semibold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isSocketConnected ? 'Connected' : 'Syncing'}</span>
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Operations</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
