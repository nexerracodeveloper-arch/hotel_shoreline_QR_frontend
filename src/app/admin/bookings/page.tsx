'use client';

import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  Mail,
  X,
  Loader2,
  BedDouble,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [totalAmount, setTotalAmount] = useState('240');
  const [instantCheckIn, setInstantCheckIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, roomsRes] = await Promise.all([
        api.admin.getBookings(),
        api.admin.getRooms(),
      ]);
      if (bookingsRes.success) setBookings(bookingsRes.bookings || []);
      if (roomsRes.success) {
        setRooms(roomsRes.rooms || []);
        if (roomsRes.rooms?.length > 0 && !selectedRoomId) {
          setSelectedRoomId(roomsRes.rooms[0].id);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !guestName || !guestPhone) {
      toast.error('Please complete required fields');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.admin.createBooking({
        roomId: selectedRoomId,
        guestName,
        guestPhone,
        guestEmail,
        checkInDate,
        checkOutDate,
        totalAmount: parseFloat(totalAmount) || 100,
        instantCheckIn,
      });

      if (res.success) {
        toast.success(`Booking created for ${guestName}!`);
        setIsModalOpen(false);
        setGuestName('');
        setGuestPhone('');
        setGuestEmail('');
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await api.admin.updateBookingStatus(id, status);
      if (res.success) {
        toast.success(`Booking marked as ${status}`);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.guestName.toLowerCase().includes(q) ||
        b.guestPhone.toLowerCase().includes(q) ||
        (b.room?.roomNumber && b.room.roomNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Guest Bookings & Check-In Desk</h1>
          <p className="text-xs text-slate-400 mt-1">
            Assign rooms, check guests in/out, and link guests to their room QR code ordering.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Guest Check-In</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by guest name, phone, or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500 w-full sm:w-auto"
        >
          <option value="all">All Bookings</option>
          <option value="CHECKED_IN">Checked In (Active)</option>
          <option value="CONFIRMED">Confirmed (Upcoming)</option>
          <option value="CHECKED_OUT">Checked Out</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
          <p className="text-xs">Loading reservations...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
          No bookings found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b) => {
            const statusBadge: Record<string, string> = {
              CHECKED_IN: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
              CONFIRMED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
              CHECKED_OUT: 'bg-slate-800 text-slate-400 border-slate-700',
              CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
            };

            const roomObj = rooms.find((r) => r.id === b.roomId);

            return (
              <div
                key={b.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl shrink-0">
                    <BedDouble className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white">{b.guestName}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-amber-400 font-bold font-mono text-xs">
                        ROOM {roomObj?.roomNumber || '—'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{b.guestPhone}</span>
                      </span>
                      <span>
                        Dates: {new Date(b.checkInDate).toLocaleDateString()} &rarr;{' '}
                        {new Date(b.checkOutDate).toLocaleDateString()}
                      </span>
                      <span>Folio: ${Number(b.totalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider ${
                      statusBadge[b.status] || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {b.status.replace(/_/g, ' ')}
                  </span>

                  {b.status === 'CONFIRMED' && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, 'CHECKED_IN')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold cursor-pointer"
                    >
                      Check-In
                    </button>
                  )}

                  {b.status === 'CHECKED_IN' && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, 'CHECKED_OUT')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Check-Out
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white">New Room Booking / Check-In</h2>
              <p className="text-xs text-slate-400 mt-1">
                Assign a guest to a room so they can place orders from the room QR code.
              </p>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Assign Room
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} ({r.type.replace(/_/g, ' ')}) - {r.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Guest Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555)..."
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="guest@email.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Check-In Date
                  </label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Check-Out Date
                  </label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Total Rate ($)
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="instant"
                  checked={instantCheckIn}
                  onChange={(e) => setInstantCheckIn(e.target.checked)}
                  className="rounded border-slate-800 text-amber-500 focus:ring-0"
                />
                <label htmlFor="instant" className="text-xs text-slate-300 cursor-pointer">
                  Mark as <strong>Checked In Immediately</strong> (Occupies room)
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4" />
                    <span>Confirm Booking & Check-In</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
