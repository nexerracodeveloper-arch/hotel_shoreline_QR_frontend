'use client';

import { useEffect, useState, use } from 'react';
import {
  Hotel,
  Utensils,
  BellRing,
  Clock,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Wifi,
  ChevronRight,
  Send,
  Loader2,
  X,
  Droplets,
  Shirt,
  Wrench,
  PhoneCall,
  BedDouble,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export default function GuestRoomPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const qrToken = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'menu' | 'amenities' | 'orders'>('menu');

  // Menu State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterVegOnly, setFilterVegOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [specialNotes, setSpecialNotes] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Amenities State
  const [selectedAmenity, setSelectedAmenity] = useState<string>('EXTRA_TOWELS');
  const [amenityDetails, setAmenityDetails] = useState('');
  const [submittingAmenity, setSubmittingAmenity] = useState(false);

  // Live Orders & Requests
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [liveRequests, setLiveRequests] = useState<any[]>([]);

  // Fetch initial room & catalog data
  const loadRoomInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.guest.getRoomInfo(qrToken);
      if (data.success) {
        setRoomData(data);
        setLiveOrders(data.recentOrders || []);
        setLiveRequests(data.recentRequests || []);
        if (data.activeGuest?.guestName) {
          setGuestName(data.activeGuest.guestName);
        }
      } else {
        setError(data.error || 'Could not locate room');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to hotel system');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoomInfo();
  }, [qrToken]);

  // Setup Socket.IO for real-time order & request updates
  useEffect(() => {
    if (!roomData?.room?.id) return;

    const socket = getSocket();
    socket.emit('join:room', roomData.room.id);

    // Listen for order status updates
    socket.on('order:status_changed', (updatedOrder: any) => {
      setLiveOrders((prev) => {
        const index = prev.findIndex((o) => o.id === updatedOrder.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedOrder;
          return next;
        }
        return [updatedOrder, ...prev];
      });
      toast.info(`Room Service Order #${updatedOrder.orderNumber} status: ${updatedOrder.status.replace(/_/g, ' ')}`);
    });

    // Listen for service request updates
    socket.on('request:status_changed', (updatedReq: any) => {
      setLiveRequests((prev) => {
        const index = prev.findIndex((r) => r.id === updatedReq.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedReq;
          return next;
        }
        return [updatedReq, ...prev];
      });
      toast.info(`Concierge Request (${updatedReq.type.replace(/_/g, ' ')}) status: ${updatedReq.status}`);
    });

    return () => {
      socket.off('order:status_changed');
      socket.off('request:status_changed');
    };
  }, [roomData?.room?.id]);

  // Cart operations
  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
    toast.success(`Added ${item.name} to cart`);
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.id === id) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Submit Order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    try {
      setSubmittingOrder(true);
      const res = await api.guest.placeOrder({
        qrToken,
        guestName,
        guestPhone,
        specialNotes,
        items: cart.map((i) => ({
          menuItemId: i.id,
          quantity: i.quantity,
          notes: i.notes,
        })),
      });

      if (res.success) {
        toast.success('Room Service Order Placed Successfully!');
        setLiveOrders((prev) => [res.order, ...prev]);
        setCart([]);
        setIsCartOpen(false);
        setActiveTab('orders');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Submit Amenity Request
  const handleRequestAmenity = async () => {
    try {
      setSubmittingAmenity(true);
      const res = await api.guest.submitRequest({
        qrToken,
        type: selectedAmenity,
        details: amenityDetails,
      });

      if (res.success) {
        toast.success(res.message || 'Service request submitted!');
        setLiveRequests((prev) => [res.serviceRequest, ...prev]);
        setAmenityDetails('');
        setActiveTab('orders');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmittingAmenity(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold">Connecting to your Room...</h2>
        <p className="text-xs text-slate-400 mt-1">Verifying room QR signature</p>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl mb-4">
          <AlertCircle className="w-10 h-10 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-white">QR Code Not Recognized</h2>
        <p className="text-sm text-slate-400 max-w-sm mt-2">{error || 'Unable to load room service catalog.'}</p>
        <button
          onClick={loadRoomInfo}
          className="mt-6 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
        >
          Retry Scan
        </button>
      </div>
    );
  }

  const { room, hotel, activeGuest, catalog } = roomData;

  // Flattened items for filtering
  const allCatalogItems = (catalog || []).flatMap((cat: any) =>
    (cat.items || []).map((item: any) => ({ ...item, categoryName: cat.name }))
  );

  const filteredItems = allCatalogItems.filter((item: any) => {
    if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
    if (filterVegOnly && !item.isVeg) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Hotel Luxury In-Room Header */}
      <header className="relative bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/80 px-4 pt-6 pb-5">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                <Hotel className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-white">{hotel.name}</h1>
                <p className="text-[11px] text-amber-400/80 font-semibold tracking-wider uppercase">
                  In-Room Concierge & Dining
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-mono">High-Speed</span>
            </div>
          </div>

          {/* Room Badge Card */}
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-transparent border border-amber-500/30 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
                Current Location
              </div>
              <div className="text-2xl font-black text-white tracking-tight">
                ROOM {room.roomNumber}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Floor {room.floor} • {room.type.replace(/_/g, ' ')}
              </div>
            </div>

            <div className="text-right">
              {activeGuest ? (
                <div>
                  <div className="text-[11px] text-slate-400">Welcome,</div>
                  <div className="text-sm font-bold text-amber-300">{activeGuest.guestName}</div>
                </div>
              ) : (
                <div className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Room Verified</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1.5 mt-5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Dining</span>
            </button>

            <button
              onClick={() => setActiveTab('amenities')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'amenities'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Amenities</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 relative cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Track ({liveOrders.length + liveRequests.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-4 pt-5">
        {/* ========================================================== */}
        {/* TAB 1: IN-ROOM DINING MENU                                  */}
        {/* ========================================================== */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            {/* Search and Veg Filter Bar */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search food, drinks, desserts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => setFilterVegOnly(!filterVegOnly)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer border ${
                  filterVegOnly
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    filterVegOnly ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
                <span>Veg</span>
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                }`}
              >
                All Items
              </button>
              {(catalog || []).map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                      : 'bg-slate-900 border border-slate-800 text-slate-400'
                  }`}
                >
                  {cat.name.split('&')[0].trim()}
                </button>
              ))}
            </div>

            {/* Dishes Feed */}
            <div className="space-y-3 pt-1">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No menu items found matching your filters.
                </div>
              ) : (
                filteredItems.map((item: any) => {
                  const inCart = cart.find((i) => i.id === item.id);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 flex gap-3.5 transition-all"
                    >
                      {/* Image Thumbnail */}
                      {item.imageUrl && (
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-800 relative">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          <div
                            className={`absolute top-1.5 left-1.5 w-3 h-3 rounded-full border border-slate-950 ${
                              item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                        </div>
                      )}

                      {/* Info & Add to Cart */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="font-bold text-sm text-white leading-snug truncate">
                              {item.name}
                            </h3>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-2.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-sm text-amber-400">
                              ${Number(item.price).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center space-x-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{item.prepTimeMin}m</span>
                            </span>
                          </div>

                          {inCart ? (
                            <div className="flex items-center space-x-2 bg-amber-500/20 border border-amber-500/40 rounded-lg px-2 py-1">
                              <button
                                onClick={() => updateCartQuantity(item.id, -1)}
                                className="text-amber-300 hover:text-white"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-bold text-white px-1">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQuantity(item.id, 1)}
                                className="text-amber-300 hover:text-white"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: HOTEL AMENITIES & CONCIERGE                          */}
        {/* ========================================================== */}
        {activeTab === 'amenities' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <h2 className="font-bold text-sm text-white flex items-center space-x-2">
                <BellRing className="w-4 h-4 text-amber-400" />
                <span>Instant In-Room Service Desk</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select an amenity or service needed for Room {room.roomNumber}. Our housekeeping & front desk staff will be dispatched immediately.
              </p>
            </div>

            {/* Quick Amenity Tiles */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { type: 'EXTRA_TOWELS', label: 'Extra Towels', icon: Sparkles, desc: 'Fresh bath sheets' },
                { type: 'BOTTLED_WATER', label: 'Bottled Water', icon: Droplets, desc: 'Complimentary spring water' },
                { type: 'HOUSEKEEPING', label: 'Room Cleaning', icon: BedDouble, desc: 'Turndown & fresh linens' },
                { type: 'TOILETRIES', label: 'Toiletries Kit', icon: Sparkles, desc: 'Dental & shaving sets' },
                { type: 'LAUNDRY', label: 'Laundry Pickup', icon: Shirt, desc: 'Dry clean & pressing' },
                { type: 'MAINTENANCE', label: 'Maintenance', icon: Wrench, desc: 'AC, TV, Wi-Fi help' },
                { type: 'CALL_RECEPTION', label: 'Call Front Desk', icon: PhoneCall, desc: 'Immediate receptionist callback' },
                { type: 'OTHER', label: 'Custom Request', icon: Send, desc: 'Special in-room assistance' },
              ].map((amenity) => {
                const isSelected = selectedAmenity === amenity.type;
                const Icon = amenity.icon;
                return (
                  <button
                    key={amenity.type}
                    onClick={() => setSelectedAmenity(amenity.type)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500'
                        : 'bg-slate-900 border-slate-800/80 text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                    <div className="font-bold text-xs text-white">{amenity.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{amenity.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Details Box */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Additional Instructions for Staff (Optional):
              </label>
              <textarea
                rows={3}
                placeholder="E.g., Please bring 2 extra bath sheets and deliver after 4 PM..."
                value={amenityDetails}
                onChange={(e) => setAmenityDetails(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />

              <button
                onClick={handleRequestAmenity}
                disabled={submittingAmenity}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide uppercase transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submittingAmenity ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Request to Room {room.roomNumber}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: TRACK ACTIVE ORDERS & CONCIERGE REQUESTS             */}
        {/* ========================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Live Room Orders & Services</span>
            </h2>

            {/* Placed Dining Orders */}
            {liveOrders.length === 0 && liveRequests.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                No active orders or requests placed yet for Room {room.roomNumber}.
              </div>
            ) : (
              <div className="space-y-3">
                {liveOrders.map((order: any) => {
                  const statusColors: Record<string, string> = {
                    PENDING: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    ACCEPTED: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                    PREPARING: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
                    OUT_FOR_DELIVERY: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                    DELIVERED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                    CANCELLED: 'bg-red-500/20 text-red-300 border-red-500/40',
                  };

                  return (
                    <div
                      key={order.id}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-mono text-xs font-bold text-white">
                            #{order.orderNumber}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider ${
                            statusColors[order.status] || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="border-t border-slate-800/80 pt-2 space-y-1.5 text-xs text-slate-300">
                        {(order.items || []).map((it: any) => (
                          <div key={it.id} className="flex justify-between">
                            <span>
                              {it.quantity}x {it.menuItemName || 'Item'}
                            </span>
                            <span className="font-semibold text-slate-200">
                              ${Number(it.totalPrice || 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.specialNotes && (
                        <div className="text-[11px] bg-slate-950 p-2 rounded-lg text-amber-300/90 italic">
                          Note: "{order.specialNotes}"
                        </div>
                      )}

                      <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Total Charged to Room:</span>
                        <span className="font-extrabold text-amber-400 text-sm">
                          ${Number(order.totalAmount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Service Requests */}
                {liveRequests.map((req: any) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">
                        {req.type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {req.details || 'Standard room request'}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase ${
                        req.status === 'RESOLVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : req.status === 'IN_PROGRESS'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Cart Sticky Bar (When items in cart) */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-0 right-0 max-w-md mx-auto px-4 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-2xl shadow-amber-500/30 flex items-center justify-between cursor-pointer transition-all"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center text-xs font-black">
                {cartItemCount}
              </div>
              <span className="text-sm">View Room Service Order</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-base font-extrabold">${cartTotal.toFixed(2)}</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">
                  Room {room.roomNumber} Dining Order
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="font-semibold text-white truncate">{item.name}</div>
                    <div className="text-slate-400">${item.price.toFixed(2)} each</div>
                  </div>

                  <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700/80 rounded-lg px-2 py-1">
                    <button
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="text-slate-300 hover:text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-white px-1">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="text-slate-300 hover:text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-16 text-right font-bold text-amber-400">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}

              {/* Special Instructions */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Kitchen Notes / Special Requests:
                </label>
                <input
                  type="text"
                  placeholder="E.g., No onions, extra cutlery, warm water..."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Guest Details */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Guest Name
                  </label>
                  <input
                    type="text"
                    placeholder="Guest name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555)..."
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Total & Checkout Button */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="font-bold text-white">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Room Service Delivery</span>
                <span className="text-emerald-400 font-semibold">Complimentary</span>
              </div>
              <div className="flex items-center justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
                <span>Total to Room Folio:</span>
                <span className="text-amber-400 text-lg">${cartTotal.toFixed(2)}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={submittingOrder}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submittingOrder ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm & Send to Kitchen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
