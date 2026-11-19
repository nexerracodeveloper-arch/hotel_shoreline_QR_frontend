'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BedDouble,
  UtensilsCrossed,
  BellRing,
  DollarSign,
  QrCode,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Loader2,
  CalendarCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, ordersRes, reqsRes] = await Promise.all([
        api.admin.getAnalytics().catch(() => ({ stats: null })),
        api.admin.getOrders().catch(() => ({ orders: [] })),
        api.admin.getRequests().catch(() => ({ requests: [] })),
      ]);

      if (statsRes?.stats) setStats(statsRes.stats);
      if (ordersRes?.orders) setRecentOrders(ordersRes.orders.slice(0, 5));
      if (reqsRes?.requests) setRecentRequests(reqsRes.requests.slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for live socket broadcasts to refresh stats
    const socket = getSocket();
    socket.on('order:new', () => loadData());
    socket.on('request:new', () => loadData());

    return () => {
      socket.off('order:new');
      socket.off('request:new');
    };
  }, []);

  if (loading && !stats) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
        <p className="text-xs">Loading operational metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hotel Management Live Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Operations & In-Room Dining Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time occupancy tracking, kitchen order routing, and housekeeping dispatch.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/admin/rooms"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Generate & Print QRs</span>
          </Link>
          <Link
            href="/admin/bookings"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center space-x-2 border border-slate-700 transition-all"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>New Booking</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Occupancy Rate</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {stats?.occupancyRate || 0}%
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>
              <strong>{stats?.occupiedRooms || 0}</strong> occupied
            </span>
            <span>{stats?.vacantRooms || 0} vacant</span>
          </div>
        </div>

        {/* Active Dining Orders */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Live Room Orders</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            {stats?.activeOrders || 0}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>{stats?.pendingOrders || 0} pending acceptance</span>
            <Link href="/admin/orders" className="text-amber-400 hover:underline">
              View &rarr;
            </Link>
          </div>
        </div>

        {/* Pending Concierge Requests */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Service Requests</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <BellRing className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-400">
            {stats?.pendingRequests || 0}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Housekeeping / Water</span>
            <Link href="/admin/requests" className="text-blue-400 hover:underline">
              Resolve &rarr;
            </Link>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">F&B Room Revenue</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            ${Number(stats?.totalRevenue || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">Billed to room folios</div>
        </div>
      </div>

      {/* Split Feeds: Live Room Orders & Concierge Service Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Queue */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UtensilsCrossed className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-base text-white">Recent Room Service Orders</h2>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300"
            >
              All Orders &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No orders placed yet today.
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold font-mono">
                        ROOM {order.roomNumber || '—'}
                      </span>
                      <span className="font-bold text-white">#{order.orderNumber}</span>
                    </div>
                    <div className="text-slate-400 mt-1 truncate">
                      {order.items?.map((i: any) => `${i.quantity}x ${i.menuItemName}`).join(', ')}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-amber-400">
                      ${Number(order.totalAmount).toFixed(2)}
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Concierge Desk */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BellRing className="w-5 h-5 text-blue-400" />
              <h2 className="font-bold text-base text-white">Active Housekeeping & Amenities</h2>
            </div>
            <Link
              href="/admin/requests"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              Manage &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {recentRequests.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                All guest requests resolved!
              </div>
            ) : (
              recentRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold font-mono">
                        ROOM {req.roomNumber || '—'}
                      </span>
                      <span className="font-bold text-white">
                        {req.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-slate-400 mt-1 truncate">
                      {req.details || 'Standard room request'}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase shrink-0 ${
                      req.status === 'RESOLVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : req.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
