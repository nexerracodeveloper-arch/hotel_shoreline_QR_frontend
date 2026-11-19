'use client';

import { useEffect, useState } from 'react';
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Volume2,
  VolumeX,
  Printer,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatRupees } from '@/lib/currency';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play audio chime for new incoming orders
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // Audio autoplay policy
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getOrders();
      if (res.success) {
        setOrders(res.orders || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const socket = getSocket();

    // When guest places an order
    socket.on('order:new', (newOrder: any) => {
      setOrders((prev) => [newOrder, ...prev]);
      playChime();
      toast.success(`🛎️ New Dining Order from Room ${newOrder.roomNumber}!`, {
        duration: 6000,
      });
    });

    // When status changes
    socket.on('order:updated', (updated: any) => {
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    });

    return () => {
      socket.off('order:new');
      socket.off('order:updated');
    };
  }, [soundEnabled]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await api.admin.updateOrderStatus(id, status);
      if (res.success) {
        toast.success(`Order #${res.order.orderNumber} updated to ${status.replace(/_/g, ' ')}`);
        setOrders((prev) => prev.map((o) => (o.id === id ? res.order : o)));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order status');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Live Room Orders Feed</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time incoming dining requests from in-room QR scans with kitchen routing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Chime Active' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'ALL', label: 'All Orders', count: orders.length },
          { key: 'PENDING', label: 'Pending', count: orders.filter((o) => o.status === 'PENDING').length },
          { key: 'ACCEPTED', label: 'Accepted', count: orders.filter((o) => o.status === 'ACCEPTED').length },
          { key: 'PREPARING', label: 'In Kitchen', count: orders.filter((o) => o.status === 'PREPARING').length },
          { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', count: orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length },
          { key: 'DELIVERED', label: 'Delivered', count: orders.filter((o) => o.status === 'DELIVERED').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center space-x-1.5 cursor-pointer ${
              statusFilter === tab.key
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === tab.key
                  ? 'bg-slate-950 text-amber-400 font-bold'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
          <p className="text-xs">Connecting to Kitchen routing engine...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
          No orders found under {statusFilter}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const statusConfig: Record<string, { badge: string; border: string }> = {
              PENDING: {
                badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                border: 'border-amber-500/50',
              },
              ACCEPTED: {
                badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                border: 'border-slate-800',
              },
              PREPARING: {
                badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
                border: 'border-slate-800',
              },
              OUT_FOR_DELIVERY: {
                badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                border: 'border-purple-500/40',
              },
              DELIVERED: {
                badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                border: 'border-slate-800/60 opacity-80',
              },
              CANCELLED: {
                badge: 'bg-red-500/20 text-red-300 border-red-500/40',
                border: 'border-slate-800/60 opacity-60',
              },
            };

            const cfg = statusConfig[order.status] || {
              badge: 'bg-slate-800 text-slate-300',
              border: 'border-slate-800',
            };

            return (
              <div
                key={order.id}
                className={`p-5 rounded-2xl bg-slate-900 border ${cfg.border} flex flex-col justify-between space-y-4 shadow-xl transition-all`}
              >
                <div>
                  {/* Order Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-black font-mono text-sm">
                        ROOM {order.roomNumber || '—'}
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        #{order.orderNumber}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider ${cfg.badge}`}
                    >
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Guest & Time */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2.5">
                    <span>Guest: {order.guestName || 'In-Room Guest'}</span>
                    <span className="text-[11px]">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="mt-3.5 space-y-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    {(order.items || []).map((it: any) => (
                      <div key={it.id} className="flex justify-between items-start">
                        <span className="text-slate-200">
                          <strong className="text-amber-400 mr-1.5">{it.quantity}x</strong>
                          {it.menuItemName || 'Item'}
                        </span>
                        <span className="font-semibold text-slate-300">
                          {formatRupees(it.totalPrice)}
                        </span>
                      </div>
                    ))}

                    {order.specialNotes && (
                      <div className="text-[11px] text-amber-300/90 pt-1.5 border-t border-slate-800/80 italic">
                        Note: "{order.specialNotes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Total & Action Pipeline */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Total Billed to Room:</span>
                    <span className="text-base font-extrabold text-amber-400">
                      {formatRupees(order.totalAmount)}
                    </span>
                  </div>

                  {/* Action Pipeline Buttons */}
                  <div className="flex items-center space-x-2">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        Accept Order
                      </button>
                    )}

                    {order.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-indigo-500/20"
                      >
                        Start Cooking (Kitchen)
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                        className="flex-1 py-2 px-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-purple-500/20 flex items-center justify-center space-x-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Send for Delivery</span>
                      </button>
                    )}

                    {order.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Delivered to Room</span>
                      </button>
                    )}

                    {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                        className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs transition-all cursor-pointer"
                        title="Cancel Order"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
