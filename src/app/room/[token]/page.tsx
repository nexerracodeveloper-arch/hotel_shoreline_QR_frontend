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

    // Setup real-time updates for guest orders & requests
    const socket = getSocket();

    const handleRoomConnect = () => {
      if (roomData?.room?.id) {
        socket.emit('join:room', roomData.room.id);
      }
    };

    socket.on('connect', handleRoomConnect);

    socket.on('order:status_changed', (updatedOrder: any) => {
      setLiveOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
      toast.info(`Order #${updatedOrder.orderNumber} status: ${updatedOrder.status.replace(/_/g, ' ')}`);
    });

    socket.on('request:status_changed', (updatedReq: any) => {
      setLiveRequests((prev) =>
        prev.map((r) => (r.id === updatedReq.id ? updatedReq : r))
      );
      toast.info(`Service request status: ${updatedReq.status.replace(/_/g, ' ')}`);
    });

    return () => {
      socket.off('connect', handleRoomConnect);
      socket.off('order:status_changed');
      socket.off('request:status_changed');
    };
  }, [qrToken, roomData?.room?.id]);

  // Cart Management
  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
    toast.success(`Added ${item.name} to order`);
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Submit In-Room Order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    try {
      setSubmittingOrder(true);
      const res = await api.guest.placeOrder({
        qrToken,
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        specialNotes: specialNotes.trim() || undefined,
        items: cart.map((i) => ({
          menuItemId: i.id,
          quantity: i.quantity,
          notes: i.notes,
        })),
      });

      if (res.success) {
        toast.success(res.message || 'Your in-room order has been received by our kitchen!');
        setCart([]);
        setIsCartOpen(false);
        setSpecialNotes('');
        // Add to live orders
        setLiveOrders((prev) => [res.order, ...prev]);
        setActiveTab('orders');
      } else {
        toast.error(res.error || 'Failed to place order');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error while sending order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Submit Concierge / Amenity Request
  const handleRequestAmenity = async () => {
    try {
      setSubmittingAmenity(true);
      const res = await api.guest.submitRequest({
        qrToken,
        type: selectedAmenity,
        details: amenityDetails.trim() || undefined,
      });

      if (res.success) {
        toast.success(res.message || 'Service request transmitted to hotel staff!');
        setAmenityDetails('');
        setLiveRequests((prev) => [res.serviceRequest, ...prev]);
        setActiveTab('orders');
      } else {
        toast.error(res.error || 'Failed to send request');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not send service request');
    } finally {
      setSubmittingAmenity(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen parchment-bg flex flex-col items-center justify-center p-6 text-center text-stone-900">
        <div className="p-1 rounded-2xl bg-gradient-to-br from-[#dfba73] to-[#8c6527] shadow-xl shadow-amber-900/15 mb-4 animate-pulse">
          <img
            src="/logo.png"
            alt="Hotel Shoreline Vista"
            className="h-20 sm:h-24 w-auto object-contain rounded-xl mx-auto"
          />
        </div>
        <Loader2 className="w-6 h-6 text-[#b88e44] animate-spin mb-3" />
        <h2 className="font-cinzel text-lg font-bold text-stone-900 tracking-wider uppercase">
          Hotel Shoreline Vista
        </h2>
        <p className="font-serif-luxury italic text-xs text-[#8c6527] mt-0.5 tracking-wide">
          Waves Multicuisine & Bar
        </p>
        <p className="text-[11px] text-stone-500 mt-2">Opening in-room dining catalog...</p>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen parchment-bg flex flex-col items-center justify-center p-6 text-center text-stone-900">
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 rounded-2xl mb-4">
          <AlertCircle className="w-10 h-10 mx-auto" />
        </div>
        <h2 className="font-cinzel text-xl font-bold text-stone-900">QR Code Not Recognized</h2>
        <p className="text-xs text-stone-600 max-w-sm mt-2">
          {error || 'Unable to load room service catalog.'}
        </p>
        <button
          onClick={loadRoomInfo}
          className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#dfba73] to-[#b88e44] hover:brightness-105 text-white font-bold text-xs tracking-wider uppercase cursor-pointer shadow-md shadow-amber-900/20 transition-all"
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
    <div className="min-h-screen parchment-bg text-stone-900 pb-28 selection:bg-amber-200 selection:text-amber-950">
      {/* ================================================================ */}
      {/* LUXURY HOTEL IN-ROOM PARCHMENT & GOLD HEADER                     */}
      {/* ================================================================ */}
      <header className="relative bg-gradient-to-b from-[#fdfbf7] via-[#faf6ee] to-[#f5efe4] border-b border-[#dfc07b]/40 px-3 sm:px-6 pt-5 pb-5 shadow-sm">
        <div className="max-w-6xl mx-auto">
          {/* Top Brand & Location */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Official Hotel Shoreline Vista Logo */}
              <div className="p-1 rounded-2xl bg-gradient-to-br from-[#dfba73] via-[#b88e44] to-[#8c6527] shadow-md shadow-amber-900/10 shrink-0">
                <img
                  src="/logo.png"
                  alt="Hotel Shoreline Vista"
                  className="h-12 sm:h-14 w-auto object-contain rounded-xl"
                />
              </div>
              <div>
                <h1 className="font-cinzel font-bold text-sm sm:text-lg tracking-wide text-stone-900 uppercase flex items-center gap-1.5">
                  <span>Hotel Shoreline Vista</span>
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-serif-luxury italic text-xs sm:text-sm font-semibold text-[#8c6527]">
                    waves
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#8c6527] bg-[#f5ebd6] px-1.5 py-0.2 rounded border border-[#dfc07b]/40">
                    Multicuisine & Bar
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowInfoBanner(!showInfoBanner)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#faf5ea] border border-[#dfc07b]/50 text-xs text-stone-700 hover:text-stone-900 hover:border-[#b88e44] transition-all cursor-pointer shadow-xs"
                title="View Dining Hours & Guest Guidelines"
              >
                <Info className="w-3.5 h-3.5 text-[#b88e44]" />
                <span className="text-[11px] font-medium hidden sm:inline">Dining Info</span>
                {showInfoBanner ? <ChevronUp className="w-3 h-3 text-[#b88e44]" /> : <ChevronDown className="w-3 h-3 text-[#b88e44]" />}
              </button>

              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#faf5ea] border border-[#dfc07b]/30 text-xs text-stone-600">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-mono hidden sm:inline">Wi-Fi Connected</span>
                <span className="text-[11px] font-mono sm:hidden">Online</span>
              </div>
            </div>
          </div>

          {/* Dining Hours & Notices Accordion (From Shoreline PDF Page 3) */}
          {showInfoBanner && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-[#ffffff] to-[#faf5ec] border border-[#dfc07b]/50 text-xs text-stone-700 space-y-3 transition-all shadow-sm">
              <div className="flex items-center justify-between border-b border-[#dfc07b]/30 pb-2">
                <span className="font-cinzel font-bold text-stone-900 text-xs tracking-wider uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#b88e44]" />
                  <span>Official Dining Hours & Guidelines</span>
                </span>
                <span className="text-[10px] text-[#8c6527] bg-[#f5ebd6] px-2 py-0.5 rounded-full border border-[#dfc07b]/40 font-semibold">
                  5% GST Applicable
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-[#faf7f0] border border-[#ebd9b8]">
                  <div className="text-[#8c6527] font-bold uppercase text-[10px]">Breakfast</div>
                  <div className="text-stone-800 mt-0.5 font-medium">08:00 – 10:00 hrs</div>
                </div>
                <div className="p-2 rounded-xl bg-[#faf7f0] border border-[#ebd9b8]">
                  <div className="text-[#8c6527] font-bold uppercase text-[10px]">Lunch</div>
                  <div className="text-stone-800 mt-0.5 font-medium">12:30 – 15:30 hrs</div>
                </div>
                <div className="p-2 rounded-xl bg-[#faf7f0] border border-[#ebd9b8]">
                  <div className="text-[#8c6527] font-bold uppercase text-[10px]">Dinner</div>
                  <div className="text-stone-800 mt-0.5 font-medium">19:30 – 22:45 hrs</div>
                </div>
                <div className="p-2 rounded-xl bg-[#faf7f0] border border-[#ebd9b8]">
                  <div className="text-[#8c6527] font-bold uppercase text-[10px]">All Day Dining</div>
                  <div className="text-stone-800 mt-0.5 font-medium">11:00 – 22:45 hrs</div>
                </div>
              </div>
              <p className="text-[10px] text-stone-500 leading-relaxed border-t border-[#ebd9b8]/50 pt-2">
                <strong className="text-stone-800 font-semibold">Allergens Advisory:</strong> Please inform our service associate if allergic to milk, wheat, peanuts, soya, tree nuts, or mushrooms. Waves Bar strictly complies with international responsible service guidelines.
              </p>
            </div>
          )}

          {/* Room Location Banner */}
          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#ffffff] via-[#faf6ed] to-[#f4eee2] border border-[#dfc07b]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#8c6527]">
                Verified In-Room Dining Location
              </div>
              <div className="text-2xl sm:text-3xl font-cinzel font-black text-stone-900 tracking-tight flex items-baseline gap-2">
                <span>ROOM {room.roomNumber}</span>
                <span className="text-xs font-sans text-stone-600 font-semibold tracking-normal">
                  (Floor {room.floor})
                </span>
              </div>
              <div className="text-xs text-stone-600 mt-0.5">
                {room.type.replace(/_/g, ' ')} Suite • In-Room QR Service Active
              </div>
            </div>

            <div className="sm:text-right">
              {activeGuest ? (
                <div>
                  <div className="text-[11px] text-stone-500">Welcome,</div>
                  <div className="text-sm font-bold text-stone-900">{activeGuest.guestName}</div>
                </div>
              ) : (
                <div className="text-xs text-emerald-700 font-semibold flex items-center sm:justify-end space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Direct Room Billing Active</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs (Dining / Amenities / Track) */}
          <div className="grid grid-cols-3 gap-1.5 mt-4 sm:mt-5 p-1 bg-[#ede6d6] border border-[#dfc07b]/30 rounded-xl sm:max-w-md sm:mx-auto">
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-gradient-to-r from-[#dfba73] via-[#b88e44] to-[#8c6527] text-white font-extrabold shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Dining</span>
            </button>

            <button
              onClick={() => setActiveTab('amenities')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'amenities'
                  ? 'bg-gradient-to-r from-[#dfba73] via-[#b88e44] to-[#8c6527] text-white font-extrabold shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Amenities</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 relative cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-gradient-to-r from-[#dfba73] via-[#b88e44] to-[#8c6527] text-white font-extrabold shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Track ({liveOrders.length + liveRequests.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/* MAIN CONTENT AREA                                                */}
      {/* ================================================================ */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* ============================================================== */}
        {/* TAB 1: IN-ROOM DINING MENU                                      */}
        {/* ============================================================== */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* Sticky Search & Filter Bar */}
            <div className="sticky top-0 z-30 bg-[#faf7f0]/95 backdrop-blur-md pt-2 pb-3 -mx-3 px-3 sm:-mx-6 sm:px-6 border-b border-[#dfc07b]/30 space-y-2.5">
              {/* Menu Section Switcher: All | Multicuisine Restaurant | Waves Bar */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#ede5d4] border border-[#dfc07b]/40 rounded-2xl">
                <button
                  onClick={() => {
                    setActiveSection('all');
                    setSelectedCategory('all');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                    activeSection === 'all'
                      ? 'bg-gradient-to-r from-[#dfba73] via-[#b88e44] to-[#8c6527] text-white shadow-sm font-black'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  <span>All Items</span>
                  <span className="text-[10px] opacity-85">({allCatalogItems.length})</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection('food');
                    setSelectedCategory('all');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                    activeSection === 'food'
                      ? 'bg-gradient-to-r from-[#dfba73] via-[#b88e44] to-[#8c6527] text-white shadow-sm font-black'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span className="truncate">🍽️ Multicuisine</span>
                  <span className="text-[10px] opacity-85 hidden sm:inline">({foodCount})</span>
                </button>

                <button
                  onClick={() => {
                    setActiveSection('bar');
                    setSelectedCategory('all');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                    activeSection === 'bar'
                      ? 'bg-gradient-to-r from-[#dfba73] via-[#b88e44] to-[#8c6527] text-white shadow-sm font-black'
                      : 'text-stone-700 hover:text-stone-900'
                  }`}
                >
                  <Wine className="w-3.5 h-3.5" />
                  <span className="truncate">🍸 Waves Bar</span>
                  <span className="text-[10px] opacity-85 hidden sm:inline">({barCount})</span>
                </button>
              </div>

              {/* Search Bar & Veg Toggle */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder={
                      activeSection === 'bar'
                        ? 'Search cocktails, beers, whiskeys, wines...'
                        : 'Search soups, starters, biryanis, desserts...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[#dfc07b]/40 rounded-xl pl-10 pr-4 py-2.5 text-sm sm:text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#b88e44] shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-700"
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
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white border-[#dfc07b]/40 text-stone-700 hover:border-emerald-500 shadow-xs'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center p-0.5 ${filterVegOnly ? 'border-white' : 'border-emerald-600'}`}>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        filterVegOnly ? 'bg-white' : 'bg-emerald-600'
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
                      ? 'bg-gradient-to-r from-[#dfba73] via-[#b88e44] to-[#8c6527] text-white font-bold shadow-xs'
                      : 'bg-white border border-[#dfc07b]/40 text-stone-700 hover:text-stone-900'
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
                          ? 'bg-gradient-to-r from-[#dfba73] via-[#b88e44] to-[#8c6527] text-white font-bold shadow-xs'
                          : 'bg-white border border-[#dfc07b]/40 text-stone-700 hover:text-stone-900'
                      }`}
                    >
                      <span>{displayLabel}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-[#ede5d4] text-stone-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dishes Feed: Authentic Printed Menu Layout matching Screenshot */}
            <div>
              {filteredItems.length === 0 ? (
                <div className="text-center py-16 text-stone-500 text-xs bg-white rounded-3xl border border-[#ebd9b8] p-8 space-y-2 parchment-card">
                  <Utensils className="w-8 h-8 text-[#b88e44]/50 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-stone-900">No items found</p>
                  <p className="text-xs text-stone-500">
                    Try clearing your search query or selecting a different category.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setActiveSection('all');
                      setFilterVegOnly(false);
                    }}
                    className="mt-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#dfba73] to-[#b88e44] text-white text-xs font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : selectedCategory === 'all' && !searchQuery ? (
                /* Grouped by Category matching Shoreline Vista Printed Menu Pages */
                <div className="space-y-8">
                  {visibleCategories.map((cat: any) => {
                    const catItems = (cat.items || []).filter((item: any) => {
                      if (filterVegOnly && !item.isVeg) return false;
                      return true;
                    });

                    if (catItems.length === 0) return null;

                    const displayCatName = cat.name.replace(/^Waves Bar - /, '');
                    const isGoldHeading =
                      displayCatName.toUpperCase().includes('SALAD') ||
                      displayCatName.toUpperCase().includes('BAR') ||
                      displayCatName.toUpperCase().includes('SIGNATURE');

                    return (
                      <div
                        key={cat.id}
                        className="parchment-card rounded-3xl p-5 sm:p-8 gold-left-ribbon shadow-sm space-y-6"
                      >
                        {/* Authentic Category Header matching SOUPS / SALADS & CHAATS screenshot */}
                        <div className="text-center pt-1 pb-2">
                          <h2
                            className={`font-cinzel text-xl sm:text-2xl font-bold tracking-widest uppercase ${
                              isGoldHeading ? 'gold-text-gradient' : 'text-stone-900'
                            }`}
                          >
                            {displayCatName}
                          </h2>
                          {/* Tapered Metallic Gold Divider Line */}
                          <div className="gold-divider-tapered max-w-xs sm:max-w-md mx-auto mt-2" />
                        </div>

                        {/* Items Rows */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                          {catItems.map((item: any) => {
                            const inCart = cart.find((i) => i.id === item.id);
                            return (
                              <div
                                key={item.id}
                                className="border-b border-[#ebd9b8]/60 pb-4 flex flex-col justify-between group"
                              >
                                <div>
                                  {/* Title & Price Row */}
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                                      {/* Veg / Non-Veg dot badge */}
                                      <span
                                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center p-0.5 shrink-0 self-center ${
                                          item.isVeg ? 'border-emerald-600' : 'border-red-600'
                                        }`}
                                        title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                                          }`}
                                        />
                                      </span>

                                      <h3 className="font-serif-luxury font-semibold text-base sm:text-lg text-stone-900 leading-snug">
                                        {item.name}
                                      </h3>
                                    </div>

                                    {/* Price Column right-aligned */}
                                    <div className="font-serif-luxury font-bold text-stone-900 text-base sm:text-lg shrink-0 tracking-tight">
                                      {formatRupees(item.price)}
                                    </div>
                                  </div>

                                  {/* Description (Italian serif / muted sepia) */}
                                  <p className="font-serif-luxury text-stone-600 text-xs sm:text-[13px] leading-relaxed italic mt-1 pl-5">
                                    {item.description || 'Artisanal creation by Shoreline Vista culinary & bar team.'}
                                  </p>
                                </div>

                                {/* Order Action Control */}
                                <div className="mt-2.5 pt-1.5 flex items-center justify-between pl-5">
                                  <span className="text-[10px] text-stone-400 font-medium">
                                    {item.isAvailable ? 'Freshly Prepared' : 'Sold Out'}
                                  </span>

                                  {inCart ? (
                                    <div className="flex items-center space-x-2 bg-[#f6efe1] border border-[#dfc07b] rounded-lg px-2 py-0.5 shadow-xs">
                                      <button
                                        onClick={() => updateCartQuantity(item.id, -1)}
                                        className="w-5 h-5 rounded bg-white hover:bg-[#dfba73] text-stone-700 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                        aria-label="Decrease quantity"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="text-xs font-bold text-stone-900 px-1">
                                        {inCart.quantity}
                                      </span>
                                      <button
                                        onClick={() => updateCartQuantity(item.id, 1)}
                                        className="w-5 h-5 rounded bg-[#b88e44] hover:bg-[#a67d35] text-white flex items-center justify-center transition-all cursor-pointer font-bold"
                                        aria-label="Increase quantity"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => addToCart(item)}
                                      disabled={!item.isAvailable}
                                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#dfba73] via-[#b88e44] to-[#8c6527] hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold tracking-wider uppercase transition-all shadow-xs cursor-pointer flex items-center space-x-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>ADD</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Flat Filtered / Searched Grid with Left Ribbon */
                <div className="parchment-card rounded-3xl p-5 sm:p-8 gold-left-ribbon shadow-sm space-y-6">
                  {/* Category Header */}
                  {selectedCategory !== 'all' && (
                    <div className="text-center pt-1 pb-2">
                      <h2 className="font-cinzel text-xl sm:text-2xl font-bold tracking-widest uppercase text-stone-900">
                        {visibleCategories.find((c: any) => c.id === selectedCategory)?.name.replace(/^Waves Bar - /, '') || 'Menu'}
                      </h2>
                      <div className="gold-divider-tapered max-w-xs sm:max-w-md mx-auto mt-2" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    {filteredItems.map((item: any) => {
                      const inCart = cart.find((i) => i.id === item.id);
                      return (
                        <div
                          key={item.id}
                          className="border-b border-[#ebd9b8]/60 pb-4 flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                                <span
                                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center p-0.5 shrink-0 self-center ${
                                    item.isVeg ? 'border-emerald-600' : 'border-red-600'
                                  }`}
                                  title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                                    }`}
                                  />
                                </span>

                                <h3 className="font-serif-luxury font-semibold text-base sm:text-lg text-stone-900 leading-snug">
                                  {item.name}
                                </h3>
                              </div>

                              <div className="font-serif-luxury font-bold text-stone-900 text-base sm:text-lg shrink-0 tracking-tight">
                                {formatRupees(item.price)}
                              </div>
                            </div>

                            <p className="font-serif-luxury text-stone-600 text-xs sm:text-[13px] leading-relaxed italic mt-1 pl-5">
                              {item.description || 'Artisanal creation by Shoreline Vista culinary & bar team.'}
                            </p>
                          </div>

                          <div className="mt-2.5 pt-1.5 flex items-center justify-between pl-5">
                            <span className="text-[10px] text-stone-400 font-medium">
                              {item.categoryName.replace(/^Waves Bar - /, '')}
                            </span>

                            {inCart ? (
                              <div className="flex items-center space-x-2 bg-[#f6efe1] border border-[#dfc07b] rounded-lg px-2 py-0.5 shadow-xs">
                                <button
                                  onClick={() => updateCartQuantity(item.id, -1)}
                                  className="w-5 h-5 rounded bg-white hover:bg-[#dfba73] text-stone-700 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-bold text-stone-900 px-1">
                                  {inCart.quantity}
                                </span>
                                <button
                                  onClick={() => updateCartQuantity(item.id, 1)}
                                  className="w-5 h-5 rounded bg-[#b88e44] hover:bg-[#a67d35] text-white flex items-center justify-center transition-all cursor-pointer font-bold"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                disabled={!item.isAvailable}
                                className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#dfba73] via-[#b88e44] to-[#8c6527] hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold tracking-wider uppercase transition-all shadow-xs cursor-pointer flex items-center space-x-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>ADD</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#ebd9b8] shadow-sm parchment-card gold-left-ribbon">
              <h2 className="font-cinzel font-bold text-sm sm:text-base text-stone-900 flex items-center space-x-2">
                <BellRing className="w-4 h-4 text-[#b88e44]" />
                <span>Instant In-Room Service Desk</span>
              </h2>
              <p className="text-xs text-stone-600 mt-1 font-serif-luxury italic">
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
                        ? 'bg-[#f7eed9] border-[#b88e44] text-stone-900 ring-2 ring-[#b88e44]/40 shadow-sm'
                        : 'bg-white border-[#ebd9b8] text-stone-700 hover:border-[#b88e44] shadow-xs'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-2.5 ${isSelected ? 'text-[#8c6527]' : 'text-stone-400'}`} />
                    <div className="font-bold text-xs sm:text-sm text-stone-900">{amenity.label}</div>
                    <div className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5">{amenity.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Details Box */}
            <div className="p-4 sm:p-6 rounded-3xl bg-white border border-[#ebd9b8] space-y-4 shadow-sm parchment-card">
              <label className="text-xs sm:text-sm font-semibold text-stone-800 block">
                Additional Instructions for Staff (Optional):
              </label>
              <textarea
                rows={3}
                placeholder="E.g., Please bring 2 extra bath sheets and deliver after 4 PM..."
                value={amenityDetails}
                onChange={(e) => setAmenityDetails(e.target.value)}
                className="w-full bg-[#faf7f0] border border-[#dfc07b]/40 rounded-xl p-3.5 text-sm sm:text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#b88e44]"
              />

              <button
                onClick={handleRequestAmenity}
                disabled={submittingAmenity}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#dfba73] via-[#b88e44] to-[#8c6527] hover:brightness-105 text-white font-bold text-xs sm:text-sm tracking-wide uppercase transition-all shadow-md shadow-amber-900/15 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#8c6527] flex items-center space-x-2 font-cinzel">
              <Clock className="w-4 h-4 text-[#b88e44]" />
              <span>Live Room Service & Orders</span>
            </h2>

            {liveOrders.length === 0 && liveRequests.length === 0 ? (
              <div className="p-10 text-center rounded-3xl bg-white border border-[#ebd9b8] text-stone-500 text-xs parchment-card">
                No active orders or requests placed yet for Room {room.roomNumber}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dining Orders */}
                {liveOrders.map((order: any) => {
                  const statusColors: Record<string, string> = {
                    PENDING: 'bg-amber-100 text-amber-900 border-amber-300',
                    ACCEPTED: 'bg-blue-100 text-blue-900 border-blue-300',
                    PREPARING: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                    OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-900 border-purple-300',
                    DELIVERED: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                    CANCELLED: 'bg-red-100 text-red-900 border-red-300',
                  };

                  return (
                    <div
                      key={order.id}
                      className="p-4 sm:p-5 rounded-3xl bg-white border border-[#ebd9b8] space-y-3.5 shadow-sm parchment-card gold-left-ribbon"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-mono text-xs font-bold text-stone-900">
                            Order #{order.orderNumber}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider ${
                            statusColors[order.status] || 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="border-t border-[#ebd9b8]/60 pt-2.5 space-y-2 text-xs text-stone-700 font-serif-luxury">
                        {(order.items || []).map((it: any) => (
                          <div key={it.id} className="flex justify-between">
                            <span>
                              <strong className="text-stone-900 mr-1.5">{it.quantity}x</strong>
                              {it.menuItemName || 'Item'}
                            </span>
                            <span className="font-semibold text-stone-900">
                              {formatRupees(it.totalPrice)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.specialNotes && (
                        <div className="text-[11px] bg-[#faf7f0] p-2.5 rounded-xl text-stone-700 italic border border-[#ebd9b8]/60 font-serif-luxury">
                          Note: "{order.specialNotes}"
                        </div>
                      )}

                      <div className="border-t border-[#ebd9b8]/60 pt-2.5 flex items-center justify-between text-xs">
                        <span className="text-stone-500">Total Billed to Room:</span>
                        <span className="font-bold text-stone-900 text-base font-serif-luxury">
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
                    className="p-4 sm:p-5 rounded-3xl bg-white border border-[#ebd9b8] flex items-center justify-between shadow-sm parchment-card gold-left-ribbon"
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-stone-900 font-cinzel">
                        {req.type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5 font-serif-luxury italic">
                        {req.details || 'Standard concierge request'}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase ${
                        req.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : req.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
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
      {/* FLOATING CART STICKY BAR                                         */}
      {/* ================================================================ */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-3 sm:bottom-4 left-0 right-0 max-w-xl mx-auto px-3 sm:px-6 z-40 pb-[env(safe-area-inset-bottom,0px)]">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#29221b] via-[#1c1917] to-[#120f0c] text-white font-bold shadow-2xl shadow-stone-900/40 flex items-center justify-between cursor-pointer transition-all transform active:scale-[0.99] border-2 border-[#dfba73]"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#dfba73] text-stone-950 flex items-center justify-center text-xs font-black">
                {cartItemCount}
              </div>
              <span className="text-xs sm:text-sm font-cinzel tracking-wider uppercase">View Room Service Order</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm sm:text-base font-serif-luxury font-bold text-[#dfba73]">{formatRupees(cartTotal)}</span>
              <ChevronRight className="w-5 h-5 text-[#dfba73]" />
            </div>
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* CART DRAWER / BOTTOM SHEET MODAL (Parchment & Gold)              */}
      {/* ================================================================ */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#faf7f0] border-t sm:border border-[#dfc07b] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[90vh] flex flex-col shadow-2xl pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {/* Mobile Sheet Drag Handle */}
            <div className="sm:hidden w-12 h-1 bg-[#dfc07b]/60 rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-between pb-3.5 border-b border-[#ebd9b8]">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-[#b88e44]" />
                <h3 className="font-cinzel font-bold text-sm sm:text-base text-stone-900">
                  Room {room.roomNumber} Dining Order
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-[#ede5d4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto py-3.5 space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-[#ebd9b8]/50 pb-2">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="font-serif-luxury font-bold text-stone-900 text-xs sm:text-sm truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-stone-500 font-serif-luxury">{formatRupees(item.price)} each</div>
                  </div>

                  <div className="flex items-center space-x-2 bg-white border border-[#dfc07b] rounded-xl px-2 py-1 shadow-xs">
                    <button
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-md bg-[#faf7f0] hover:bg-[#dfba73] text-stone-700 hover:text-white flex items-center justify-center cursor-pointer transition-all"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-stone-900 px-1.5 text-xs">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-md bg-[#b88e44] hover:bg-[#a67d35] text-white flex items-center justify-center cursor-pointer font-bold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-20 text-right font-serif-luxury font-bold text-stone-900 text-xs sm:text-sm">
                    {formatRupees(item.price * item.quantity)}
                  </div>
                </div>
              ))}

              {/* Special Instructions */}
              <div className="pt-3 border-t border-[#ebd9b8] space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-700 block">
                  Kitchen Notes / Special Requests:
                </label>
                <input
                  type="text"
                  placeholder="E.g., No spicy, extra cutlery, warm water..."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="w-full bg-white border border-[#dfc07b]/50 rounded-xl px-3 py-2 text-sm sm:text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#b88e44]"
                />
              </div>

              {/* Guest Details */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Guest Name
                  </label>
                  <input
                    type="text"
                    placeholder="Guest name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-white border border-[#dfc07b]/50 rounded-xl px-3 py-2 text-sm sm:text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#b88e44]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full bg-white border border-[#dfc07b]/50 rounded-xl px-3 py-2 text-sm sm:text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#b88e44]"
                  />
                </div>
              </div>
            </div>

            {/* Total & Checkout Button */}
            <div className="pt-3 border-t border-[#ebd9b8] space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-stone-600">Subtotal</span>
                <span className="font-serif-luxury font-bold text-stone-900">{formatRupees(cartTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-stone-600">
                <span>In-Room Delivery</span>
                <span className="text-emerald-700 font-semibold">Complimentary</span>
              </div>
              <div className="flex items-center justify-between text-sm sm:text-base font-extrabold text-stone-900 pt-2 border-t border-[#ebd9b8]">
                <span>Total to Room Folio:</span>
                <span className="font-serif-luxury font-bold text-stone-900 text-base sm:text-lg">{formatRupees(cartTotal)}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={submittingOrder}
                className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-[#dfba73] via-[#b88e44] to-[#8c6527] hover:brightness-105 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md shadow-amber-900/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 uppercase"
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
