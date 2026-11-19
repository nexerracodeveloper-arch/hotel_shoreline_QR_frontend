'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Hotel,
  QrCode,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Utensils,
  BellRing,
  Smartphone,
  BedDouble,
} from 'lucide-react';

const DEMO_ROOMS = [
  { roomNumber: '101', floor: 1, type: 'Standard Queen', status: 'Occupied', token: 'qr_room_101_v9k3a' },
  { roomNumber: '102', floor: 1, type: 'Standard Double', status: 'Vacant', token: 'qr_room_102_m4x8b' },
  { roomNumber: '103', floor: 1, type: 'Deluxe Suite', status: 'Cleaning', token: 'qr_room_103_p2w9c' },
  { roomNumber: '201', floor: 2, type: 'Garden Deluxe', status: 'Occupied', token: 'qr_room_201_h7n2d' },
  { roomNumber: '202', floor: 2, type: 'Super Deluxe Corner', status: 'Vacant', token: 'qr_room_202_k8t4e' },
  { roomNumber: '301', floor: 3, type: 'Executive Penthouse', status: 'Occupied', token: 'qr_room_301_f3r7g' },
  { roomNumber: '302', floor: 3, type: 'Presidential Suite', status: 'Reserved', token: 'qr_room_302_z5y1q' },
];

export default function HomePage() {
  const router = useRouter();
  const [selectedToken, setSelectedToken] = useState(DEMO_ROOMS[0].token);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-slate-100">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block leading-none">
                Grand Azure
              </span>
              <span className="text-xs text-amber-400/80 tracking-widest uppercase font-semibold">
                Resort & Suites
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Staff & Admin Login</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen In-Room QR Experience & Hotel Operating System</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight">
          Scan In-Room QR.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-400">
            Order Room Service.
          </span>{' '}
          Delivered in Minutes.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Guests scan the acrylic standee QR code placed in their room to instantly browse the curated chef menu,
          order in-room dining, request housekeeping or extra towels, with no app download required.
        </p>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur-sm">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl w-fit mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">In-Room QR Binding</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Every room has a unique QR code. The system automatically identifies the exact room number and active guest stay.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur-sm">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mb-4">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">24/7 In-Room Dining</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Full visual menu with dietary tags (Veg/Non-Veg), custom preparation notes, and real-time live kitchen progress tracking.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur-sm">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit mb-4">
              <BellRing className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Instant Concierge Desk</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              1-tap housekeeping requests for fresh towels, bottled water, toiletries, laundry pickup, and front desk callbacks.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Room QR Scanner Simulator */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Smartphone className="w-4 h-4" />
                <span>Test Guest In-Room Scan Simulator</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Choose a Room to Experience the Guest Portal
              </h2>
            </div>

            <button
              onClick={() => router.push(`/room/${selectedToken}`)}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all shrink-0 cursor-pointer"
            >
              <span>Launch Room Service</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Room Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {DEMO_ROOMS.map((room) => {
              const isSelected = selectedToken === room.token;
              return (
                <button
                  key={room.roomNumber}
                  onClick={() => setSelectedToken(room.token)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                      : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-white">Room {room.roomNumber}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        room.status === 'Occupied'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : room.status === 'Vacant'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 truncate">{room.type}</div>
                  <div className="text-[11px] text-amber-400/90 font-mono mt-2 flex items-center space-x-1">
                    <QrCode className="w-3 h-3" />
                    <span>Scan Ready</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 gap-3">
            <div className="flex items-center space-x-2">
              <BedDouble className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Selected Target: <strong>/room/{selectedToken}</strong>
              </span>
            </div>
            <Link
              href={`/room/${selectedToken}`}
              className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4"
            >
              Open in full screen &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16 py-8 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} Grand Azure Luxury Resort & Suites. All rights reserved.</p>
        <p className="mt-1">
          Decoupled Architecture: Backend on Render • Frontend on Vercel • Neon Serverless PostgreSQL
        </p>
      </footer>
    </main>
  );
}
