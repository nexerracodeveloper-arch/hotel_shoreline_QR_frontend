'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  X,
  Radio,
  ArrowRight,
  LogOut,
  RefreshCw,
  ShoppingBag,
  Layers,
  ChefHat,
  ChevronRight,
  Sparkles,
  MessageCircle,
  QrCode,
  Smartphone,
  Send,
  Save,
  Check,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, clearAuthToken } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatRupees } from '@/lib/currency';

export default function OrderDeskPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'pending' | 'preparing' | 'all'>('pending');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const soundRef = useRef(soundEnabled);

  // WhatsApp Linking & 2-Number State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [waData, setWaData] = useState<any>(null);
  const [waActionLoading, setWaActionLoading] = useState(false);
  const [masterAdminPhoneInput, setMasterAdminPhoneInput] = useState('');
  const [savingAdminPhone, setSavingAdminPhone] = useState(false);

  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  // Fetch WhatsApp status for the Room Order Desk
  const fetchWaStatus = useCallback(async () => {
    try {
      const res: any = await api.admin.getWhatsAppStatus();
      if (res && res.success) {
        setWaData(res);
        if (res.settings?.masterAdminPhone) {
          setMasterAdminPhoneInput(res.settings.masterAdminPhone);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Play synthesized audio alert when an order arrives from a room
  const playNewOrderChime = useCallback(() => {
    if (!soundRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.25); // D6

      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.7);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  const loadOrders = async (showToast = false) => {
    try {
      setLoading(true);
      const res = await api.admin.getOrders();
      if (res.success) {
        setOrders(res.orders || []);
        setLastUpdated(new Date());
        if (showToast) {
          toast.success('Orders refreshed');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch room orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    fetchWaStatus();

    const socket = getSocket();
    socket.emit('join:admin');

    const handleConnect = () => setIsSocketConnected(true);
    const handleDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    setIsSocketConnected(socket.connected);

    // Instant notification when any guest scans their room QR & submits an order
    const handleNewOrder = (newOrder: any) => {
      setOrders((prev) => {
        const exists = prev.some((o) => o.id === newOrder.id);
        if (exists) return prev;
        return [newOrder, ...prev];
      });
      playNewOrderChime();
      toast.success(`🛎️ NEW ORDER from Room ${newOrder.roomNumber}!`, {
        description: `Order #${newOrder.orderNumber} placed just now.`,
        duration: 7000,
      });
    };

    // Live update when order status is updated
    const handleOrderUpdated = (updatedOrder: any) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    };

    // Live update when WhatsApp connection status updates
    const handleWaStatusUpdate = (updated: any) => {
      setWaData((prev: any) => ({ ...prev, ...updated }));
      if (updated.settings?.masterAdminPhone) {
        setMasterAdminPhoneInput(updated.settings.masterAdminPhone);
      }
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:updated', handleOrderUpdated);
    socket.on('whatsapp:status', handleWaStatusUpdate);

    // Gentle polling fallback every 8 seconds
    const interval = setInterval(() => {
      loadOrders(false);
      if (isWhatsAppModalOpen || waData?.status === 'QR_READY' || waData?.status === 'INITIALIZING') {
        fetchWaStatus();
      }
    }, 6000);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('order:new', handleNewOrder);
      socket.off('order:updated', handleOrderUpdated);
      socket.off('whatsapp:status', handleWaStatusUpdate);
      clearInterval(interval);
    };
  }, [playNewOrderChime, fetchWaStatus, isWhatsAppModalOpen, waData?.status]);

  // WhatsApp Actions
  const handleConnectWa = async () => {
    try {
      setWaActionLoading(true);
      await api.admin.restartWhatsApp();
      toast.success('Generated WhatsApp pairing QR code');
      await fetchWaStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start WhatsApp');
    } finally {
      setWaActionLoading(false);
    }
  };

  const handleLogoutWa = async () => {
    try {
      setWaActionLoading(true);
      await api.admin.logoutWhatsApp();
      toast.info('WhatsApp session disconnected');
      await fetchWaStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect session');
    } finally {
      setWaActionLoading(false);
    }
  };

  const handleSendTestWa = async () => {
    try {
      setWaActionLoading(true);
      const res: any = await api.admin.sendWhatsAppTest();
      if (res && res.success) {
        toast.success(`Test alert sent successfully to ${res.target}!`);
      } else {
        toast.error(res.error || 'Failed to send test message');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error executing test alert');
    } finally {
      setWaActionLoading(false);
    }
  };

  const handleSaveAdminPhone = async () => {
    if (!masterAdminPhoneInput.trim()) {
      toast.error('Please enter Master Admin WhatsApp phone number');
      return;
    }
    try {
      setSavingAdminPhone(true);
      await api.admin.updateWhatsAppSettings({
        masterAdminPhone: masterAdminPhoneInput,
        targetType: 'master_admin',
        enabled: true,
      });
      toast.success(`Saved! Alerts will be sent to Master Admin (+${masterAdminPhoneInput})`);
      await fetchWaStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save Master Admin number');
    } finally {
      setSavingAdminPhone(false);
    }
  };

  // Primary Action: Accept Order
  const handleAcceptOrder = async (orderId: string, roomNumber: string) => {
    try {
      setActionLoadingId(orderId);
      const res = await api.admin.updateOrderStatus(orderId, 'ACCEPTED');
      if (res.success) {
        toast.success(`✅ Order for Room ${roomNumber} Accepted!`, {
          description: 'Guest device has been notified: Order is being prepared.',
        });
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? res.order : o))
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept order');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Secondary Action: Reject Order
  const handleRejectOrder = async (orderId: string, roomNumber: string) => {
    if (!confirm(`Are you sure you want to reject the order for Room ${roomNumber}?`)) {
      return;
    }

    try {
      setActionLoadingId(orderId);
      const res = await api.admin.updateOrderStatus(orderId, 'CANCELLED');
      if (res.success) {
        toast.info(`Order for Room ${roomNumber} was rejected.`);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? res.order : o))
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Progress Action: Mark Delivered / Out for Delivery
  const handleProgressOrder = async (orderId: string, nextStatus: string, roomNumber: string) => {
    try {
      setActionLoadingId(orderId);
      const res = await api.admin.updateOrderStatus(orderId, nextStatus);
      if (res.success) {
        toast.success(`Order for Room ${roomNumber} updated to ${nextStatus.replace(/_/g, ' ')}`);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? res.order : o))
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    router.replace('/login');
  };

  // Filtered lists
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const preparingOrders = orders.filter((o) => ['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(o.status));
  const completedOrders = orders.filter((o) => ['DELIVERED', 'CANCELLED'].includes(o.status));

  const visibleOrders =
    filterTab === 'pending'
      ? pendingOrders
      : filterTab === 'preparing'
      ? preparingOrders
      : orders;

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins === 1) return '1 min ago';
      if (mins < 60) return `${mins} mins ago`;
      const hrs = Math.floor(mins / 60);
      return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500/30">
      {/* ============================================================== */}
      {/* TOP HEADER: CLEAN, PROFESSIONAL ORDER TERMINAL BAR             */}
      {/* ============================================================== */}
      <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40 backdrop-blur-md px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand & Terminal Identity */}
          <div className="flex items-center space-x-3">
            <div className="p-1 bg-gradient-to-br from-[#dfba73] to-[#8c6527] rounded-xl shadow-xs shrink-0">
              <img
                src="/logo.png"
                alt="Hotel Shoreline Vista"
                className="h-10 sm:h-11 w-auto object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-xl font-black text-white tracking-tight uppercase">
                  Room Orders Live Desk
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Staff Terminal
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                <span className="text-[#dfba73] font-bold font-serif">WAVES</span>
                <span>•</span>
                <span>Multicuisine Bar and Restaurant</span>
              </div>
            </div>
          </div>

          {/* Controls: Audio Toggle, Live Status, Refresh, Logout */}
          <div className="flex items-center space-x-2 self-end sm:self-auto">
            {/* Live Status Indicator */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/80 text-xs">
              <Radio
                className={`w-3.5 h-3.5 ${
                  isSocketConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
                }`}
              />
              <span className="text-slate-300 hidden md:inline">
                {isSocketConnected ? 'Live Realtime Feed' : 'Connecting...'}
              </span>
            </div>

            {/* WhatsApp 2-Number Connection Status / Pairing Button */}
            <button
              onClick={() => {
                setIsWhatsAppModalOpen(true);
                fetchWaStatus();
              }}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                waData?.status === 'CONNECTED'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : waData?.status === 'QR_READY'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse hover:bg-amber-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
              }`}
              title="WhatsApp Order Alerts Setup"
            >
              {waData?.status === 'CONNECTED' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline font-mono">
                    {waData.phoneNumber ? `+${waData.phoneNumber}` : 'WhatsApp Connected'}
                  </span>
                </>
              ) : waData?.status === 'QR_READY' ? (
                <>
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline font-bold">Connect WhatsApp (QR)</span>
                  <span className="sm:hidden font-bold">QR</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Connect WhatsApp</span>
                  <span className="sm:hidden">WA</span>
                </>
              )}
            </button>

            {/* Sound Chime Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={soundEnabled ? 'Order Sound Alert: ON' : 'Order Sound Alert: MUTED'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Chime ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">Muted</span>
                </>
              )}
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => loadOrders(true)}
              disabled={loading}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Link to Full Master Admin if permitted */}
            <Link
              href="/admin"
              className="hidden lg:flex py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all items-center space-x-1"
              title="Full Master Admin"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Master Panel</span>
            </Link>

            {/* Sign Out */}
            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* FILTER TABS: NEW / PENDING (ACTION REQUIRED) | PREPARING | ALL */}
      {/* ============================================================== */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterTab('pending')}
              className={`py-2 px-3.5 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer ${
                filterTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>Waiting for Acceptance</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterTab === 'pending'
                    ? 'bg-slate-950 text-amber-300'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {pendingOrders.length}
              </span>
            </button>

            <button
              onClick={() => setFilterTab('preparing')}
              className={`py-2 px-3.5 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer ${
                filterTab === 'preparing'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>In Kitchen / Delivery</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterTab === 'preparing'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {preparingOrders.length}
              </span>
            </button>

            <button
              onClick={() => setFilterTab('all')}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <span>All Orders ({orders.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden md:block">
            Auto-refreshes in real-time as guests scan & order
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MAIN ORDERS STREAM                                             */}
      {/* ============================================================== */}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-6 flex-1">
        {loading && orders.length === 0 ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-white">Connecting to live room orders...</p>
            <p className="text-xs text-slate-500 mt-1">Listening for incoming guest room requests</p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white">
              {filterTab === 'pending'
                ? 'All Clear! No Pending Orders'
                : 'No Orders In This Category'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {filterTab === 'pending'
                ? 'Any new food or beverage order placed by guests scanning their room QR card will appear here instantly with sound chime.'
                : 'Switch tabs above to view orders in preparation or completed history.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {visibleOrders.map((order) => {
              const isPending = order.status === 'PENDING';
              const isAccepted = order.status === 'ACCEPTED' || order.status === 'PREPARING';
              const isDelivering = order.status === 'OUT_FOR_DELIVERY';
              const isDelivered = order.status === 'DELIVERED';
              const isCancelled = order.status === 'CANCELLED';
              const isLoadingThis = actionLoadingId === order.id;

              return (
                <div
                  key={order.id}
                  className={`rounded-3xl border transition-all flex flex-col justify-between overflow-hidden shadow-xl ${
                    isPending
                      ? 'bg-gradient-to-b from-slate-900 to-slate-900/90 border-amber-500/60 ring-2 ring-amber-500/20'
                      : isAccepted
                      ? 'bg-slate-900/90 border-blue-500/40'
                      : isDelivering
                      ? 'bg-slate-900/90 border-purple-500/40'
                      : isDelivered
                      ? 'bg-slate-900/60 border-slate-800 opacity-80'
                      : 'bg-slate-900/40 border-slate-800/80 opacity-60'
                  }`}
                >
                  {/* Top Bar: Room Number & Order Time */}
                  <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40">
                    <div className="flex items-start justify-between gap-2">
                      {/* PROMINENT ROOM NUMBER BADGE */}
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`py-1 px-3.5 rounded-xl font-black text-xl sm:text-2xl tracking-tight flex items-baseline space-x-1.5 shadow-md ${
                            isPending
                              ? 'bg-amber-500 text-slate-950'
                              : isAccepted
                              ? 'bg-blue-600 text-white'
                              : isDelivering
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          <span className="text-xs uppercase tracking-widest opacity-80 font-bold">ROOM</span>
                          <span>{order.roomNumber}</span>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                            {order.room?.type ? `${order.room.type.replace(/_/g, ' ')} Suite` : 'Premium Room'}
                          </div>
                          {order.guestName && (
                            <div className="text-xs font-semibold text-slate-200 mt-0.5">
                              {order.guestName}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status & Relative Time */}
                      <div className="text-right">
                        <div
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPending
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                              : isAccepted
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : isDelivering
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : isDelivered
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </div>
                        <div className="flex items-center justify-end space-x-1 text-[11px] text-slate-400 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(order.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono mt-2">
                      Order #{order.orderNumber}
                    </div>
                  </div>

                  {/* Order Details: Exact Items & Notes */}
                  <div className="p-4 sm:p-5 flex-1 space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                      <span>Order Items ({order.items?.length || 0})</span>
                    </div>

                    <div className="space-y-2">
                      {(order.items || []).map((item: any, idx: number) => {
                        const isVeg = item.isVegetarian || item.menuItem?.isVegetarian;
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              {/* Veg / Non-Veg Indicator */}
                              <span
                                className={`w-3 h-3 rounded-xs border flex items-center justify-center p-0.5 shrink-0 ${
                                  isVeg ? 'border-emerald-500' : 'border-rose-500'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                />
                              </span>

                              {/* Quantity Badge */}
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-black text-xs">
                                {item.quantity}x
                              </span>

                              {/* Name */}
                              <span className="font-bold text-slate-100">
                                {item.name || item.menuItem?.name}
                              </span>
                            </div>

                            <span className="font-mono text-slate-300 font-semibold">
                              {formatRupees(item.price * item.quantity)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Special Instructions / Notes */}
                    {order.specialNotes && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                        <strong className="block text-[10px] uppercase font-bold tracking-wider text-amber-400">
                          Special Guest Request:
                        </strong>
                        <span className="italic mt-0.5 block">{order.specialNotes}</span>
                      </div>
                    )}

                    {/* Total Amount */}
                    <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Total Bill Amount:</span>
                      <span className="text-base sm:text-lg font-black text-white font-mono">
                        {formatRupees(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Actions: Accept / Reject / Progress */}
                  <div className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800">
                    {isPending ? (
                      <div className="grid grid-cols-3 gap-2">
                        {/* Big Prominent Green Accept Button */}
                        <button
                          onClick={() => handleAcceptOrder(order.id, order.roomNumber)}
                          disabled={isLoadingThis}
                          className="col-span-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4 text-slate-950" />
                          <span>Accept Order</span>
                        </button>

                        {/* Secondary Reject Button */}
                        <button
                          onClick={() => handleRejectOrder(order.id, order.roomNumber)}
                          disabled={isLoadingThis}
                          className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/80 font-bold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : isAccepted ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleProgressOrder(order.id, 'OUT_FOR_DELIVERY', order.roomNumber)}
                          disabled={isLoadingThis}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/20 disabled:opacity-50"
                        >
                          <span>Out for Delivery</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleProgressOrder(order.id, 'DELIVERED', order.roomNumber)}
                          disabled={isLoadingThis}
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Delivered</span>
                        </button>
                      </div>
                    ) : isDelivering ? (
                      <button
                        onClick={() => handleProgressOrder(order.id, 'DELIVERED', order.roomNumber)}
                        disabled={isLoadingThis}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Delivered to Room {order.roomNumber}</span>
                      </button>
                    ) : (
                      <div className="text-center text-[11px] text-slate-500 py-1 font-medium">
                        Order Completed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* 2-NUMBER WHATSAPP CONNECTION & ALERT DISPATCHER MODAL           */}
      {/* ============================================================== */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                    <span>WhatsApp Order Dispatcher</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      2-Phone Setup
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect this Order Desk to send automated alerts directly to the Master Admin.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Architecture Explanation Banner */}
            <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-800/50 to-emerald-500/10 border border-slate-800">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">
                    Phone 2 (Sender)
                  </div>
                  <div className="text-xs font-semibold text-white">Order Desk WhatsApp</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Paired via QR below</div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="text-[10px] font-bold text-slate-400">Guest Orders</div>
                  <ArrowRight className="w-4 h-4 text-amber-400 animate-pulse my-0.5" />
                  <div className="text-[9px] text-emerald-400 font-mono">Auto Dispatch</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">
                    Phone 1 (Receiver)
                  </div>
                  <div className="text-xs font-semibold text-white">Master Admin</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Gets loud WhatsApp alerts</div>
                </div>
              </div>
            </div>

            {/* WhatsApp Connection Box for Phone 2 (Order Desk) */}
            <div className="mt-4 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Step 1: Order Desk WhatsApp Pairing
                    </span>
                  </div>
                  {waData?.status === 'CONNECTED' ? (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Connected (+{waData.phoneNumber})</span>
                    </span>
                  ) : waData?.status === 'QR_READY' ? (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      <span>Ready to Scan</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      <span>Not Paired</span>
                    </span>
                  )}
                </div>

                {/* State: CONNECTED */}
                {waData?.status === 'CONNECTED' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start space-x-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Active Sender Device: +{waData.phoneNumber}</div>
                        <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          This Order Desk phone is online and ready to automatically dispatch order notifications when guests place orders.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleSendTestWa}
                        disabled={waActionLoading}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{waActionLoading ? 'Sending...' : 'Send Test Alert to Master Admin'}</span>
                      </button>

                      <button
                        onClick={handleLogoutWa}
                        disabled={waActionLoading}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        title="Disconnect this WhatsApp session"
                      >
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* State: QR READY */}
                {waData?.status === 'QR_READY' && waData?.qrCode && (
                  <div className="space-y-3 text-center">
                    <div className="p-3 bg-white rounded-2xl inline-block shadow-lg border border-slate-200">
                      <img
                        src={waData.qrCode}
                        alt="WhatsApp Web QR Code"
                        className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                      />
                    </div>
                    <div className="text-xs text-slate-300 space-y-1">
                      <p className="font-semibold text-white">How to scan with Order Desk phone:</p>
                      <p className="text-[11px] text-slate-400">
                        1. Open WhatsApp &gt; Settings or 3 Dots &gt; <strong>Linked Devices</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        2. Tap <strong>Link a Device</strong> and point camera at the QR code above
                      </p>
                    </div>
                    <div className="pt-1">
                      <button
                        onClick={handleConnectWa}
                        disabled={waActionLoading}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold inline-flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${waActionLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh QR Code</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* State: INITIALIZING */}
                {waData?.status === 'INITIALIZING' && (
                  <div className="py-8 text-center space-y-2">
                    <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-white">Generating WhatsApp pairing QR code...</p>
                    <p className="text-[11px] text-slate-400">Please wait 2-3 seconds</p>
                  </div>
                )}

                {/* State: DISCONNECTED or null */}
                {(!waData?.status || waData?.status === 'DISCONNECTED' || waData?.status === 'FAILED') && (
                  <div className="py-4 text-center space-y-3">
                    <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                      Click below to generate a pairing QR code. You will scan it with the Order Desk WhatsApp phone.
                    </p>
                    <button
                      onClick={handleConnectWa}
                      disabled={waActionLoading}
                      className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>{waActionLoading ? 'Starting...' : 'Connect WhatsApp (Scan QR)'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Destination Setup (Master Admin Number 1) */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Step 2: Master Admin Phone (Alert Recipient)
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter the Master Admin's WhatsApp number. Every room order received by this desk will be instantly dispatched to this number:
                </p>

                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      value={masterAdminPhoneInput}
                      onChange={(e) => setMasterAdminPhoneInput(e.target.value)}
                      placeholder="e.g. 9876543210 or 919876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={handleSaveAdminPhone}
                    disabled={savingAdminPhone}
                    className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingAdminPhone ? 'Saving...' : 'Save Recipient'}</span>
                  </button>
                </div>

                {waData?.settings?.masterAdminPhone ? (
                  <div className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Active Target: +{waData.settings.masterAdminPhone}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-400">
                    ⚠️ Recipient number not set yet. Enter Master Admin number and click Save.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
              <Link
                href="/admin/whatsapp"
                className="text-xs text-slate-400 hover:text-amber-400 flex items-center space-x-1 transition-colors"
              >
                <span>Master Admin WhatsApp Settings</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
