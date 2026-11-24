'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  BedDouble,
  QrCode,
  Plus,
  Download,
  Printer,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  X,
  Loader2,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatRupees } from '@/lib/currency';

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add Room Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newFloor, setNewFloor] = useState('1');
  const [newType, setNewType] = useState('STANDARD');
  const [newPrice, setNewPrice] = useState('2500');
  const [newCapacity, setNewCapacity] = useState('2');
  const [newDescription, setNewDescription] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);

  // QR Studio Modal State
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getRooms();
      if (res.success) {
        setRooms(res.rooms || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // Open QR Studio for a room
  const handleOpenQrStudio = async (room: any) => {
    setSelectedRoom(room);
    setIsQrModalOpen(true);

    try {
      const targetUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/room/${room.qrToken}`
          : `http://localhost:3000/room/${room.qrToken}`;

      const dataUrl = await QRCode.toDataURL(targetUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      toast.error('Failed to generate QR preview');
    }
  };

  // Download raw QR PNG
  const handleDownloadQrPng = () => {
    if (!qrDataUrl || !selectedRoom) return;
    const link = document.createElement('a');
    link.download = `Room_${selectedRoom.roomNumber}_QR_Code.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success(`Downloaded QR code for Room ${selectedRoom.roomNumber}`);
  };

  // Download Full Standee Card on Canvas
  const handleDownloadStandeeCard = () => {
    if (!qrDataUrl || !selectedRoom) return;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 12;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Hotel Name Header
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOTEL SHORELINE VISTA', 400, 80);

    // Waves Logo Bold Text
    ctx.fillStyle = '#8c6527';
    ctx.font = 'bold 34px serif';
    ctx.fillText('WAVES', 400, 120);

    // Subtitle
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('MULTICUISINE BAR AND RESTAURANT', 400, 150);

    // Load Food Banner & QR Image
    const foodImg = new Image();
    const qrImg = new Image();

    let imagesLoaded = 0;
    const onBothLoaded = () => {
      imagesLoaded++;
      if (imagesLoaded === 2) {
        // Draw Food Banner with rounded corners
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(100, 175, 600, 190, [16]);
        ctx.clip();
        try {
          ctx.drawImage(foodImg, 100, 175, 600, 190);
        } catch {
          // Fallback if image draw fails
        }
        ctx.restore();

        // Room Number Box with Premium Room badge
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(240, 385, 320, 85, [16]);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PREMIUM ROOM', 400, 412);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 34px sans-serif';
        ctx.fillText(`ROOM ${selectedRoom.roomNumber}`, 400, 452);

        // Floor and Type
        ctx.fillStyle = '#64748b';
        ctx.font = '16px sans-serif';
        ctx.fillText(`Floor ${selectedRoom.floor} • Premium Suite`, 400, 495);

        // Instructions
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('Scan with your phone camera', 400, 528);

        ctx.fillStyle = '#64748b';
        ctx.font = '15px sans-serif';
        ctx.fillText('to view the menu & order in-room food & drinks', 400, 552);

        // Draw QR Image
        ctx.drawImage(qrImg, 260, 580, 280, 280);

        // Wi-Fi Footer Box
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(150, 890, 500, 90, [12]);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('Complimentary High-Speed Wi-Fi', 400, 925);
        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.fillText('Network: ShorelineVista-Guest  •  No Password Required', 400, 955);

        // Footer
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText('Hotel Shoreline Vista • Freshly Prepared & Delivered to Your Room', 400, 1030);

        const link = document.createElement('a');
        link.download = `Room_${selectedRoom.roomNumber}_Standee_Card.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success(`Generated Standee Card for Room ${selectedRoom.roomNumber}`);
      }
    };

    foodImg.onload = onBothLoaded;
    foodImg.onerror = onBothLoaded;
    qrImg.onload = onBothLoaded;
    qrImg.onerror = onBothLoaded;

    foodImg.src = '/food-banner.jpg';
    qrImg.src = qrDataUrl;
  };

  // Trigger Native Browser Print Dialog
  const handlePrintStandee = () => {
    window.print();
  };

  // Add Room Submission
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber) {
      toast.error('Please enter room number');
      return;
    }

    try {
      setAddingRoom(true);
      const res = await api.admin.createRoom({
        roomNumber: newRoomNumber,
        floor: parseInt(newFloor, 10),
        type: newType,
        pricePerNight: parseFloat(newPrice),
        capacity: parseInt(newCapacity, 10),
        description: newDescription,
      });

      if (res.success) {
        toast.success(`Room ${res.room.roomNumber} created with generated QR token!`);
        setIsAddModalOpen(false);
        setNewRoomNumber('');
        setNewDescription('');
        loadRooms();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create room');
    } finally {
      setAddingRoom(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (floorFilter !== 'all' && String(r.floor) !== floorFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.roomNumber.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Rooms & QR Code Studio</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage hotel rooms, check live status, and generate printable QR standees to place in each room.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Room</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search room number, suite type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Floors</option>
            <option value="1">Floor 1</option>
            <option value="2">Floor 2</option>
            <option value="3">Floor 3</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="VACANT">Vacant</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="CLEANING">Cleaning</option>
            <option value="RESERVED">Reserved</option>
          </select>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
          <p className="text-xs">Loading rooms and QR tokens...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
          No rooms found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room) => {
            const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
              OCCUPIED: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
              VACANT: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
              CLEANING: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
              RESERVED: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
            };
            const currentStatus = statusConfig[room.status] || {
              bg: 'bg-slate-800',
              text: 'text-slate-300',
              border: 'border-slate-700',
            };

            return (
              <div
                key={room.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-black text-white tracking-tight">
                        Room {room.roomNumber}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Floor {room.floor}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}`}
                    >
                      {room.status}
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>{room.type.replace(/_/g, ' ')}</span>
                    <span className="text-amber-400 font-bold">{formatRupees(room.pricePerNight)}/night</span>
                  </div>

                  {room.activeBooking ? (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                      <div className="text-[10px] text-slate-400">Current Guest:</div>
                      <div className="font-bold text-amber-300">
                        {room.activeBooking.guestName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {room.activeBooking.guestPhone}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2.5 text-xs text-slate-500 italic">
                      No active guest check-in
                    </div>
                  )}
                </div>

                {/* QR Code Action Bar */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenQrStudio(room)}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View / Download QR</span>
                  </button>

                  <Link
                    href={`/room/${room.qrToken}`}
                    target="_blank"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all"
                    title="Test Open Guest Room View"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 1: QR CODE STUDIO & DOWNLOAD CARD                    */}
      {/* ========================================================== */}
      {isQrModalOpen && selectedRoom && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-4 sm:p-8 max-h-[90vh] overflow-y-auto space-y-5 sm:space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <QrCode className="w-4 h-4" />
                <span>Printable Room QR Studio</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white mt-1">
                Room {selectedRoom.roomNumber} QR Standee Card
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Download or print this card to place on the bedside table or desk in Room {selectedRoom.roomNumber}.
              </p>
            </div>

            {/* Printable Preview Card */}
            <div
              ref={printRef}
              className="printable-standee-area bg-white text-slate-900 p-4 sm:p-6 rounded-2xl border-2 border-slate-200 text-center shadow-lg mx-auto w-full max-w-sm"
            >
              <img
                src="/logo.png"
                alt="Hotel Shoreline Vista"
                className="h-14 mx-auto mb-1 object-contain rounded-xl shadow-xs"
              />
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                HOTEL SHORELINE VISTA
              </div>

              {/* Bold Waves Logo Text & Emblem */}
              <div className="flex items-center justify-center gap-1.5 my-1">
                <img
                  src="/waves-logo-tight.png"
                  alt="Waves"
                  className="h-5 object-contain"
                />
                <span className="text-xl sm:text-2xl font-black tracking-widest text-[#8c6527] font-serif uppercase">
                  WAVES
                </span>
              </div>
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                Multicuisine Bar and Restaurant
              </div>

              {/* Food Image Banner */}
              <div className="my-2.5 overflow-hidden rounded-xl border border-amber-200/80 shadow-xs relative">
                <img
                  src="/food-banner.jpg"
                  alt="Waves Multicuisine Delicacies"
                  className="w-full h-24 sm:h-28 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent flex items-end p-2">
                  <span className="text-[9px] font-semibold text-white/95 tracking-wide drop-shadow">
                    Fresh Gourmet Delights • Coastal & Global Flavors
                  </span>
                </div>
              </div>

              {/* Room Number Box with Premium Room Badge */}
              <div className="my-2 py-1.5 px-6 bg-slate-950 text-white rounded-xl inline-block shadow-sm">
                <div className="text-[9px] uppercase tracking-widest font-black text-amber-400">
                  PREMIUM ROOM
                </div>
                <span className="text-2xl font-black tracking-tight">
                  ROOM {selectedRoom.roomNumber}
                </span>
              </div>

              <div className="text-xs text-slate-600 mb-2.5 font-medium">
                Scan with your phone camera to browse the menu & order in-room food & drinks.
              </div>

              {/* QR Image Box */}
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Room ${selectedRoom.roomNumber} QR`}
                    className="w-36 sm:w-44 h-36 sm:h-44 mx-auto"
                  />
                ) : (
                  <div className="w-36 sm:w-44 h-36 sm:h-44 flex items-center justify-center text-xs text-slate-400">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Wi-Fi Details */}
              <div className="mt-2.5 p-2 bg-slate-100 rounded-lg text-[11px] text-slate-600 border border-slate-200">
                <strong>Wi-Fi:</strong> ShorelineVista-Guest • <strong>Password:</strong> Not Required
              </div>

              <div className="mt-1.5 text-[10px] text-slate-400 font-medium">
                No app download required • Instant Room Service
              </div>
            </div>

            {/* Studio Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDownloadStandeeCard}
                className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Standee Card (PNG)</span>
              </button>

              <button
                onClick={handleDownloadQrPng}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>Download Raw QR (PNG)</span>
              </button>

              <button
                onClick={handlePrintStandee}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all cursor-pointer sm:col-span-2"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>Print Standee Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 2: ADD NEW ROOM MODAL                                */}
      {/* ========================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white">Add New Hotel Room</h2>
              <p className="text-xs text-slate-400 mt-1">
                A unique QR code token will be automatically generated for this room.
              </p>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 401"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Floor
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newFloor}
                    onChange={(e) => setNewFloor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Room Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="STANDARD">Standard Room</option>
                  <option value="DELUXE">Deluxe Room</option>
                  <option value="SUPER_DELUXE">Super Deluxe</option>
                  <option value="EXECUTIVE_SUITE">Executive Suite</option>
                  <option value="PRESIDENTIAL_SUITE">Presidential Suite</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Price Per Night (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-amber-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      placeholder="2500"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="View, bed configuration, special features..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={addingRoom}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {addingRoom ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create Room & Generate QR</span>
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
