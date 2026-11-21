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
  Search,
  Wine,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatRupees } from '@/lib/currency';

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

  // Menu Section Switcher: 'all' | 'food' | 'bar'
  const [activeSection, setActiveSection] = useState<'all' | 'food' | 'bar'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterVegOnly, setFilterVegOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfoBanner, setShowInfoBanner] = useState(false);

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
      toast.info(
        `Room Service Order #${updatedOrder.orderNumber} status: ${updatedOrder.status.replace(/_/g, ' ')}`
      );
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
      toast.info(
        `Concierge Request (${updatedReq.type.replace(/_/g, ' ')}) status: ${updatedReq.status}`
      );
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
    toast.success(`Added ${item.name} to order`);
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
      <div className="min-h-screen bg-[#0c0a08] flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10 animate-pulse">
          <Utensils className="w-7 h-7" />
        </div>
        <Loader2 className="w-7 h-7 text-amber-400 animate-spin mb-3" />
        <h2 className="text-lg font-serif-luxury text-white tracking-wide">Hotel Shoreline Vista</h2>
        <p className="text-xs text-amber-400/80 mt-1 uppercase tracking-widest font-semibold">
          Waves Multicuisine & Bar
        </p>
        <p className="text-[11px] text-slate-500 mt-2">Connecting to Room In-Room Dining Service...</p>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-[#0c0a08] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl mb-4">
          <AlertCircle className="w-10 h-10 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-white">QR Code Not Recognized</h2>
        <p className="text-sm text-slate-400 max-w-sm mt-2">
          {error || 'Unable to load room service catalog.'}
        </p>
        <button
          onClick={loadRoomInfo}
          className="mt-6 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer shadow-lg shadow-amber-500/20 transition-all"
        >
          Retry Scan
        </button>
      </div>
    );
  }

  const { room, hotel, activeGuest, catalog } = roomData;

  const isBarCategory = (name: string) => name.toLowerCase().startsWith('waves bar');

  // Filter categories by section
  const visibleCategories = (catalog || []).filter((cat: any) => {
    if (activeSection === 'food') return !isBarCategory(cat.name);
    if (activeSection === 'bar') return isBarCategory(cat.name);
    return true;
  });

  // Flattened items for filtering
  const allCatalogItems = (catalog || []).flatMap((cat: any) =>
    (cat.items || []).map((item: any) => ({
      ...item,
      categoryName: cat.name,
      isBar: isBarCategory(cat.name),
    }))
  );

  const filteredItems = allCatalogItems.filter((item: any) => {
    if (activeSection === 'food' && item.isBar) return false;
    if (activeSection === 'bar' && !item.isBar) return false;
    if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
    if (filterVegOnly && !item.isVeg) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const foodCount = allCatalogItems.filter((i: any) => !i.isBar).length;
  const barCount = allCatalogItems.filter((i: any) => i.isBar).length;

  return (
    <div className="min-h-screen bg-[#0c0a08] text-slate-100 pb-28 selection:bg-amber-500/30 wave-lines-bg">
      {/* ================================================================ */}
      {/* LUXURY HOTEL IN-ROOM RESPONSIVE HEADER                           */}
      {/* ================================================================ */}
      <header className="relative bg-gradient-to-b from-[#140f0c] via-[#100d0a] to-[#0c0a08] border-b border-[#d4af37]/25 px-3 sm:px-6 pt-5 pb-5 shadow-2xl">
        <div className="max-w-6xl mx-auto">
          {/* Top Brand & Location */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Official Gold SV Monogram & Waves Badge */}
              <div className="w-11 h-11 bg-gradient-to-br from-[#2a1f14] to-[#16100b] border-2 border-[#d4af37]/60 text-amber-300 rounded-2xl flex flex-col items-center justify-center font-cinzel font-black text-sm shadow-md shadow-amber-500/10 shrink-0">
                <span className="leading-none text-[#dfba73]">SV</span>
                <span className="w-4 h-0.5 bg-[#d4af37] mt-0.5 rounded-full" />
              </div>
              <div>
                <h1 className="font-cinzel font-bold text-sm sm:text-lg tracking-wide text-white uppercase flex items-center gap-1.5">
                  <span>Hotel Shoreline Vista</span>
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-serif-luxury italic text-xs sm:text-sm font-semibold text-[#fef3c7]">
                    waves
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-1.5 py-0.2 rounded border border-orange-500/20">
                    Multicuisine & Bar
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowInfoBanner(!showInfoBanner)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#1e1711] border border-[#d4af37]/30 text-xs text-amber-300 hover:text-white transition-all cursor-pointer"
                title="View Dining Hours & Guest Guidelines"
              >
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-medium hidden sm:inline">Dining Info</span>
                {showInfoBanner ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#1e1711] border border-[#d4af37]/20 text-xs text-slate-300">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-mono hidden sm:inline">Wi-Fi Connected</span>
                <span className="text-[11px] font-mono sm:hidden">Online</span>
              </div>
            </div>
          </div>

          {/* Dining Hours & Notices Accordion (From Shoreline PDF Page 3) */}
          {showInfoBanner && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-[#1c1510] to-[#120e0b] border border-[#d4af37]/35 text-xs text-slate-300 space-y-3 transition-all animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-2">
                <span className="font-cinzel font-bold text-amber-300 text-xs tracking-wider uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Official Dining Hours & Guidelines</span>
                </span>
                <span className="text-[10px] text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full border border-orange-500/30 font-semibold">
                  5% GST Applicable
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-[#0c0a08]/80 border border-[#d4af37]/15">
                  <div className="text-amber-400 font-bold uppercase text-[10px]">Breakfast</div>
                  <div className="text-slate-200 mt-0.5">08:00 – 10:00 hrs</div>
                </div>
                <div className="p-2 rounded-xl bg-[#0c0a08]/80 border border-[#d4af37]/15">
                  <div className="text-amber-400 font-bold uppercase text-[10px]">Lunch</div>
                  <div className="text-slate-200 mt-0.5">12:30 – 15:30 hrs</div>
                </div>
                <div className="p-2 rounded-xl bg-[#0c0a08]/80 border border-[#d4af37]/15">
                  <div className="text-amber-400 font-bold uppercase text-[10px]">Dinner</div>
                  <div className="text-slate-200 mt-0.5">19:30 – 22:45 hrs</div>
                </div>
                <div className="p-2 rounded-xl bg-[#0c0a08]/80 border border-[#d4af37]/15">
                  <div className="text-amber-400 font-bold uppercase text-[10px]">All Day Dining</div>
                  <div className="text-slate-200 mt-0.5">11:00 – 22:45 hrs</div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2">
                <strong className="text-amber-300/90 font-semibold">Allergens Advisory:</strong> Please inform our service associate if allergic to milk, wheat, peanuts, soya, tree nuts, or mushrooms. Waves Bar strictly complies with international responsible service guidelines.
              </p>
            </div>
          )}

          {/* Room Location Banner */}
          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#221811] via-[#1a130e] to-transparent border border-[#d4af37]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#dfba73]">
                Verified In-Room Dining Location
              </div>
              <div className="text-2xl sm:text-3xl font-cinzel font-black text-white tracking-tight flex items-baseline gap-2">
                <span>ROOM {room.roomNumber}</span>
                <span className="text-xs font-sans text-amber-400/90 font-semibold tracking-normal">
                  (Floor {room.floor})
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {room.type.replace(/_/g, ' ')} Suite • In-Room QR Service Active
              </div>
            </div>

            <div className="sm:text-right">
              {activeGuest ? (
                <div>
                  <div className="text-[11px] text-slate-400">Welcome,</div>
                  <div className="text-sm font-bold text-amber-300">{activeGuest.guestName}</div>
                </div>
              ) : (
                <div className="text-xs text-emerald-400 font-semibold flex items-center sm:justify-end space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Direct Room Billing Active</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs (Dining / Amenities / Track) */}
          <div className="grid grid-cols-3 gap-1.5 mt-4 sm:mt-5 p-1 bg-[#140f0c] border border-[#d4af37]/20 rounded-xl sm:max-w-md sm:mx-auto">
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold shadow-md shadow-amber-500/20'
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
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold shadow-md shadow-amber-500/20'
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
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Track ({liveOrders.length + liveRequests.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/* MAIN RESPONSIVE CONTENT AREA                                     */}
      {/* ================================================================ */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* ============================================================== */}
        {/* TAB 1: IN-ROOM DINING MENU                                      */}
        {/* ============================================================== */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            {/* Sticky Search & Filter Bar */}
            <div className="sticky top-0 z-30 bg-[#0c0a08]/95 backdrop-blur-md pt-2 pb-3 -mx-3 px-3 sm:-mx-6 sm:px-6 border-b border-[#d4af37]/20 space-y-2.5">
              {/* Menu Section Switcher: All | Multicuisine Restaurant | Waves Bar */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#150f0b] border border-[#d4af37]/25 rounded-2xl">
                <button
                  onClick={() => {
                    setActiveSection('all');
                    setSelectedCategory('all');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                    activeSection === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>All Items</span>
                  <span className="text-[10px] opacity-80">({allCatalogItems.length})</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection('food');
                    setSelectedCategory('all');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                    activeSection === 'food'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span className="truncate">🍽️ Multicuisine</span>
                  <span className="text-[10px] opacity-80 hidden sm:inline">({foodCount})</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection('bar');
                    setSelectedCategory('all');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                    activeSection === 'bar'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wine className="w-3.5 h-3.5" />
                  <span className="truncate">🍸 Waves Bar</span>
                  <span className="text-[10px] opacity-80 hidden sm:inline">({barCount})</span>
                </button>
              </div>

              {/* Search Bar & Veg Toggle */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder={
                      activeSection === 'bar'
                        ? 'Search cocktails, beers, whiskeys, wines...'
                        : 'Search soups, starters, biryanis, desserts...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#16100c] border border-[#d4af37]/25 rounded-xl pl-10 pr-4 py-2.5 text-sm sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Veg Only Toggle */}
                <button
                  onClick={() => setFilterVegOnly(!filterVegOnly)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border shrink-0 ${
                    filterVegOnly
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-[#16100c] border-[#d4af37]/25 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded border border-emerald-500 flex items-center justify-center p-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        filterVegOnly ? 'bg-emerald-400' : 'bg-emerald-600'
                      }`}
                    />
                  </span>
                  <span>Veg Only</span>
                </button>
              </div>

              {/* Category Pills (Filtered by selected section) */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : 'bg-[#16100c] border border-[#d4af37]/20 text-slate-300 hover:text-white'
                  }`}
                >
                  All ({filteredItems.length})
                </button>
                {visibleCategories.map((cat: any) => {
                  const isSelected = selectedCategory === cat.id;
                  const count = (cat.items || []).length;
                  const displayLabel = cat.name.replace(/^Waves Bar - /, '');
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center space-x-1 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                          : 'bg-[#16100c] border border-[#d4af37]/20 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span>{displayLabel}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dishes Feed: Responsive Grid */}
            <div>
              {filteredItems.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs bg-[#140f0b]/80 rounded-3xl border border-[#d4af37]/20 p-8 space-y-2">
                  <Utensils className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">No items found</p>
                  <p className="text-xs text-slate-400">
                    Try clearing your search query or selecting a different category.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setActiveSection('all');
                      setFilterVegOnly(false);
                    }}
                    className="mt-2 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {filteredItems.map((item: any) => {
                    const inCart = cart.find((i) => i.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-[#1a140f] to-[#110d0a] border border-[#d4af37]/25 hover:border-[#d4af37]/60 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-black/50 group"
                      >
                        {/* Upper Row: Left Info & Right Image */}
                        <div className="flex gap-3.5">
                          {/* Info Column */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              {/* Veg/Non-Veg Badge & Category */}
                              <div className="flex items-center space-x-1.5 mb-1.5">
                                <span
                                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center p-0.5 shrink-0 ${
                                    item.isVeg ? 'border-emerald-500' : 'border-red-500'
                                  }`}
                                  title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                                    }`}
                                  />
                                </span>
                                <span className="text-[10px] text-[#dfba73] font-bold uppercase tracking-wider truncate">
                                  {item.categoryName.replace(/^Waves Bar - /, '')}
                                </span>
                              </div>

                              <h3 className="font-bold text-sm sm:text-base text-white leading-snug">
                                {item.name}
                              </h3>

                              <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                {item.description || 'Speciality crafted by Shoreline Vista culinary & bar team.'}
                              </p>
                            </div>

                            {/* Price & Prep Time */}
                            <div className="flex items-center space-x-2.5 mt-3">
                              <span className="font-black text-base text-amber-400">
                                {formatRupees(item.price)}
                              </span>
                              {item.prepTimeMin && (
                                <span className="text-[10px] text-slate-400 flex items-center space-x-1 bg-[#241b14] px-2 py-0.5 rounded-full border border-[#d4af37]/15">
                                  <Clock className="w-3 h-3 text-amber-400/80" />
                                  <span>{item.prepTimeMin}m</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right Image Thumbnail (Responsive) */}
                          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-[#241b14] relative flex items-center justify-center border border-[#d4af37]/20 shadow-inner">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : item.isBar ? (
                              <Wine className="w-8 h-8 text-amber-500/40" />
                            ) : (
                              <Utensils className="w-8 h-8 text-amber-500/40" />
                            )}
                          </div>
                        </div>

                        {/* Bottom Row Action Button / Stepper */}
                        <div className="mt-3 pt-3 border-t border-[#d4af37]/15 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            {item.isAvailable ? 'In-Room Dining' : 'Sold Out'}
                          </span>

                          {inCart ? (
                            <div className="flex items-center space-x-2.5 bg-amber-500/20 border border-amber-500/50 rounded-xl px-3 py-1.5 shadow-sm">
                              <button
                                onClick={() => updateCartQuantity(item.id, -1)}
                                className="w-7 h-7 rounded-lg bg-amber-500/30 hover:bg-amber-500 text-amber-200 hover:text-slate-950 flex items-center justify-center transition-all cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="text-sm font-extrabold text-white px-1">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQuantity(item.id, 1)}
                                className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-all cursor-pointer font-bold"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              disabled={!item.isAvailable}
                              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center space-x-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>ADD</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: HOTEL AMENITIES & CONCIERGE                             */}
        {/* ============================================================== */}
        {activeTab === 'amenities' && (
          <div className="space-y-5">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#140f0c] border border-[#d4af37]/25 shadow-lg">
              <h2 className="font-bold text-sm sm:text-base text-white flex items-center space-x-2">
                <BellRing className="w-4 h-4 text-amber-400" />
                <span>Instant In-Room Service Desk</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select an amenity or service needed for Room {room.roomNumber}. Our housekeeping & front desk team will be dispatched immediately.
              </p>
            </div>

            {/* Quick Amenity Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { type: 'EXTRA_TOWELS', label: 'Extra Towels', icon: Sparkles, desc: 'Fresh bath sheets' },
                { type: 'BOTTLED_WATER', label: 'Bottled Water', icon: Droplets, desc: 'Packaged mineral water' },
                { type: 'HOUSEKEEPING', label: 'Room Cleaning', icon: BedDouble, desc: 'Turndown & linens' },
                { type: 'TOILETRIES', label: 'Toiletries Kit', icon: Sparkles, desc: 'Dental & shaving sets' },
                { type: 'LAUNDRY', label: 'Laundry Pickup', icon: Shirt, desc: 'Dry clean & pressing' },
                { type: 'MAINTENANCE', label: 'Maintenance', icon: Wrench, desc: 'AC, TV, Wi-Fi help' },
                { type: 'CALL_RECEPTION', label: 'Call Reception', icon: PhoneCall, desc: 'Desk callback' },
                { type: 'OTHER', label: 'Custom Request', icon: Send, desc: 'Special assistance' },
              ].map((amenity) => {
                const isSelected = selectedAmenity === amenity.type;
                const Icon = amenity.icon;
                return (
                  <button
                    key={amenity.type}
                    onClick={() => setSelectedAmenity(amenity.type)}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                        : 'bg-[#140f0c] border-[#d4af37]/20 text-slate-300 hover:bg-[#1e1711] hover:border-[#d4af37]/40'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-2.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                    <div className="font-bold text-xs sm:text-sm text-white">{amenity.label}</div>
                    <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">{amenity.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Details Box */}
            <div className="p-4 sm:p-6 rounded-2xl bg-[#140f0c] border border-[#d4af37]/25 space-y-4 shadow-lg">
              <label className="text-xs sm:text-sm font-semibold text-slate-300 block">
                Additional Instructions for Staff (Optional):
              </label>
              <textarea
                rows={3}
                placeholder="E.g., Please bring 2 extra bath sheets and deliver after 4 PM..."
                value={amenityDetails}
                onChange={(e) => setAmenityDetails(e.target.value)}
                className="w-full bg-[#0c0a08] border border-[#d4af37]/25 rounded-xl p-3.5 text-sm sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />

              <button
                onClick={handleRequestAmenity}
                disabled={submittingAmenity}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm tracking-wide uppercase transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submittingAmenity ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
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

        {/* ============================================================== */}
        {/* TAB 3: TRACK ACTIVE ORDERS & CONCIERGE REQUESTS               */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Live Room Service & Orders</span>
            </h2>

            {liveOrders.length === 0 && liveRequests.length === 0 ? (
              <div className="p-10 text-center rounded-3xl bg-[#140f0c] border border-[#d4af37]/20 text-slate-400 text-xs">
                No active orders or requests placed yet for Room {room.roomNumber}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dining Orders */}
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
                      className="p-4 sm:p-5 rounded-2xl bg-[#140f0c] border border-[#d4af37]/25 space-y-3.5 shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-mono text-xs font-bold text-white">
                            Order #{order.orderNumber}
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
                      <div className="border-t border-[#d4af37]/15 pt-2.5 space-y-2 text-xs text-slate-300">
                        {(order.items || []).map((it: any) => (
                          <div key={it.id} className="flex justify-between">
                            <span>
                              <strong className="text-amber-400 mr-1.5">{it.quantity}x</strong>
                              {it.menuItemName || 'Item'}
                            </span>
                            <span className="font-semibold text-slate-200">
                              {formatRupees(it.totalPrice)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.specialNotes && (
                        <div className="text-[11px] bg-[#0c0a08] p-2.5 rounded-xl text-amber-300/90 italic border border-[#d4af37]/15">
                          Note: "{order.specialNotes}"
                        </div>
                      )}

                      <div className="border-t border-[#d4af37]/15 pt-2.5 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Total Billed to Room:</span>
                        <span className="font-black text-amber-400 text-base">
                          {formatRupees(order.totalAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Service Requests */}
                {liveRequests.map((req: any) => (
                  <div
                    key={req.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#140f0c] border border-[#d4af37]/25 flex items-center justify-between shadow-lg"
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-white">
                        {req.type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {req.details || 'Standard concierge request'}
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

      {/* ================================================================ */}
      {/* FLOATING CART STICKY BAR (Responsive, safe-area padded)          */}
      {/* ================================================================ */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-3 sm:bottom-4 left-0 right-0 max-w-xl mx-auto px-3 sm:px-6 z-40 pb-[env(safe-area-inset-bottom,0px)]">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-2xl shadow-amber-500/40 flex items-center justify-between cursor-pointer transition-all transform active:scale-[0.99] border border-amber-300/40"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center text-xs font-black">
                {cartItemCount}
              </div>
              <span className="text-xs sm:text-sm font-black">View Room Service Order</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm sm:text-base font-black">{formatRupees(cartTotal)}</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* CART DRAWER / BOTTOM SHEET MODAL (Responsive)                     */}
      {/* ================================================================ */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#140f0c] border-t sm:border border-[#d4af37]/35 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[90vh] flex flex-col shadow-2xl pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {/* Mobile Sheet Drag Handle */}
            <div className="sm:hidden w-12 h-1 bg-slate-700 rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-between pb-3.5 border-b border-[#d4af37]/20">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-cinzel font-bold text-sm sm:text-base text-white">
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
            <div className="flex-1 overflow-y-auto py-3.5 space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="font-bold text-white text-xs sm:text-sm truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-400">{formatRupees(item.price)} each</div>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#1e1711] border border-[#d4af37]/25 rounded-xl px-2 py-1">
                    <button
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-md bg-[#2d2218] hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-extrabold text-white px-1.5 text-xs">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center cursor-pointer font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-20 text-right font-extrabold text-amber-400 text-xs sm:text-sm">
                    {formatRupees(item.price * item.quantity)}
                  </div>
                </div>
              ))}

              {/* Special Instructions */}
              <div className="pt-3 border-t border-[#d4af37]/20 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Kitchen Notes / Special Requests:
                </label>
                <input
                  type="text"
                  placeholder="E.g., No spicy, extra cutlery, warm water..."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="w-full bg-[#0c0a08] border border-[#d4af37]/25 rounded-xl px-3 py-2 text-sm sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Guest Details */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Guest Name
                  </label>
                  <input
                    type="text"
                    placeholder="Guest name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-[#0c0a08] border border-[#d4af37]/25 rounded-xl px-3 py-2 text-sm sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full bg-[#0c0a08] border border-[#d4af37]/25 rounded-xl px-3 py-2 text-sm sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Total & Checkout Button */}
            <div className="pt-3 border-t border-[#d4af37]/20 space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="font-bold text-white">{formatRupees(cartTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400">
                <span>In-Room Delivery</span>
                <span className="text-emerald-400 font-semibold">Complimentary</span>
              </div>
              <div className="flex items-center justify-between text-sm sm:text-base font-extrabold text-white pt-2 border-t border-[#d4af37]/20">
                <span>Total to Room Folio:</span>
                <span className="text-amber-400 text-base sm:text-lg">{formatRupees(cartTotal)}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={submittingOrder}
                className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm tracking-wide transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submittingOrder ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm & Send to Kitchen / Bar</span>
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
