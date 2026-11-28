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
  Copy,
  Check,
  UtensilsCrossed,
  Utensils,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatRupees } from '@/lib/currency';

const WIFI_SSID = 'Shoreline Vista_Guest';
const WIFI_PASSWORD = 'Pass@999';
const WIFI_QR_STRING = `WIFI:S:${WIFI_SSID};T:WPA;P:${WIFI_PASSWORD};;`;

// Helper: Converts floor number into elegant Title Case ordinal without the words 'floor' or 'suite'
function getFloorPremiumLabel(floor: number | string | undefined | null): string {
  const f = String(floor ?? '').trim();
  const num = parseInt(f, 10);
  const ordinals: Record<number, string> = {
    0: 'Ground Floor Premium',
    1: 'First Floor Premium',
    2: 'Second Floor Premium',
    3: 'Third Floor Premium',
    4: 'Fourth Floor Premium',
    5: 'Fifth Floor Premium',
    6: 'Sixth Floor Premium',
    7: 'Seventh Floor Premium',
    8: 'Eighth Floor Premium',
    9: 'Ninth Floor Premium',
    10: 'Tenth Floor Premium',
  };
  if (!isNaN(num) && ordinals[num]) {
    return ordinals[num];
  }
  if (f.toLowerCase() === 'g' || f.toLowerCase() === 'ground') {
    return 'Ground Floor Premium';
  }
  return f ? `${f} Floor Premium` : 'Premium Room';
}

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
  const [wifiQrDataUrl, setWifiQrDataUrl] = useState<string>('');
  const [standeeTab, setStandeeTab] = useState<'dining' | 'wifi' | 'combined'>('dining');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isWifiOnlyModalOpen, setIsWifiOnlyModalOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const wifiPrintRef = useRef<HTMLDivElement>(null);

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

  // Generate Wi-Fi Connect QR Code from official hotel credentials
  const generateWifiQr = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(WIFI_QR_STRING, {
        width: 600,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
      setWifiQrDataUrl(dataUrl);
      return dataUrl;
    } catch {
      return '';
    }
  };

  // Open standalone Hotel Wi-Fi Tent Card Studio
  const handleOpenWifiTentCard = async () => {
    await generateWifiQr();
    setIsWifiOnlyModalOpen(true);
  };

  // Open QR Studio for a room
  const handleOpenQrStudio = async (room: any) => {
    setSelectedRoom(room);
    setStandeeTab('dining');
    setIsQrModalOpen(true);
    generateWifiQr();

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

  // Download raw QR PNG (Dining or Wi-Fi depending on active tab)
  const handleDownloadQrPng = () => {
    if (standeeTab === 'wifi') {
      handleDownloadWifiQrPng();
      return;
    }
    if (!qrDataUrl || !selectedRoom) return;
    const link = document.createElement('a');
    link.download = `Room_${selectedRoom.roomNumber}_Dining_QR.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success(`Downloaded QR code for Room ${selectedRoom.roomNumber}`);
  };

  // Download raw Wi-Fi QR PNG
  const handleDownloadWifiQrPng = async () => {
    let currentWifiQr = wifiQrDataUrl;
    if (!currentWifiQr) {
      currentWifiQr = await generateWifiQr();
    }
    if (!currentWifiQr) return;
    const link = document.createElement('a');
    link.download = `Shoreline_Vista_WiFi_Connect_QR.png`;
    link.href = currentWifiQr;
    link.click();
    toast.success('Downloaded Wi-Fi Connection QR code');
  };

  // Download Full In-Room Dining Standee Card on Canvas (Matching User's Reference)
  const handleDownloadStandeeCard = () => {
    if (!qrDataUrl || !selectedRoom) return;

    const canvas = document.createElement('canvas');
    canvas.width = 850;
    canvas.height = 1250;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Soft Luxury Cream/White Background
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Elegant Outer Gold Border & Inset
    ctx.strokeStyle = '#dfba73';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.strokeStyle = '#ebd9b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

    // Load Food Banner & QR Image
    const foodImg = new Image();
    const qrImg = new Image();

    let imagesLoaded = 0;
    const onBothLoaded = () => {
      imagesLoaded++;
      if (imagesLoaded === 2) {
        // 1. Top Food Banner with rounded corners
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(50, 45, 750, 260, [20]);
        ctx.clip();
        try {
          ctx.drawImage(foodImg, 50, 45, 750, 260);
        } catch {
          // Fallback
        }

        // Left Dark Gradient Overlay for 'Restaurant' text
        const grad = ctx.createLinearGradient(50, 45, 450, 45);
        grad.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
        grad.addColorStop(0.65, 'rgba(15, 23, 42, 0.55)');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(50, 45, 500, 260);

        // Cloche / Dome line icon
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(130, 115, 22, Math.PI, 0, false);
        ctx.lineTo(160, 115);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(130, 90, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.fill();

        // Cursive 'Restaurant' script
        ctx.fillStyle = '#ffffff';
        ctx.font = 'italic bold 56px serif';
        ctx.textAlign = 'left';
        ctx.fillText('Restaurant', 85, 185);

        // DINE • RELAX • ENJOY
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('DINE  •  RELAX  •  ENJOY', 90, 225);
        ctx.restore();

        // Golden border around the banner
        ctx.strokeStyle = '#dfba73';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(50, 45, 750, 260, [20]);
        ctx.stroke();

        // 2. Room Number Box with Premium Room badge
        ctx.fillStyle = '#0e1a2f';
        ctx.beginPath();
        ctx.roundRect(245, 330, 360, 95, [20]);
        ctx.fill();
        ctx.strokeStyle = '#dfba73';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#dfba73';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PREMIUM ROOM', 425, 362);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 42px sans-serif';
        ctx.fillText(`ROOM ${selectedRoom.roomNumber}`, 425, 407);

        // 3. Floor Title Line: e.g. "Second Floor Premium" (without floor or suite words)
        ctx.strokeStyle = '#dfba73';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(100, 455);
        ctx.lineTo(260, 455);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(590, 455);
        ctx.lineTo(750, 455);
        ctx.stroke();

        ctx.fillStyle = '#8c6527';
        ctx.font = 'bold 18px serif';
        ctx.fillText(getFloorPremiumLabel(selectedRoom.floor).toUpperCase(), 425, 462);

        // 4. Two Feature Badges: Restaurant & Room Service
        // Left: Restaurant circle & text
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(175, 520, 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px serif';
        ctx.fillText('🍽️', 175, 528);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('Restaurant', 215, 515);
        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.fillText('Multi-cuisine Delights', 215, 535);

        // Center vertical divider
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(425, 495);
        ctx.lineTo(425, 545);
        ctx.stroke();

        // Right: Room Service circle & text
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(480, 520, 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 20px serif';
        ctx.fillText('🛏️', 480, 527);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('Room Service', 520, 515);
        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.fillText('Enjoy Comfort, In-Room', 520, 535);

        // 5. Scan Prompt
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('Scan with your phone camera', 425, 590);

        ctx.fillStyle = '#475569';
        ctx.font = '15px sans-serif';
        ctx.fillText('to view the menu & order in-room food & drinks', 425, 615);

        // 6. QR Code with Left & Right Radiating Gold Rays
        ctx.drawImage(qrImg, 280, 645, 290, 290);

        // Left Rays \ | /
        ctx.strokeStyle = '#dfba73';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(210, 785);
        ctx.lineTo(245, 780);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(205, 805);
        ctx.lineTo(248, 805);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(210, 825);
        ctx.lineTo(245, 830);
        ctx.stroke();

        // Right Rays / | \
        ctx.beginPath();
        ctx.moveTo(640, 785);
        ctx.lineTo(605, 780);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(645, 805);
        ctx.lineTo(602, 805);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(640, 825);
        ctx.lineTo(605, 830);
        ctx.stroke();

        // 7. Wi-Fi Box
        ctx.fillStyle = '#fffdfa';
        ctx.beginPath();
        ctx.roundRect(125, 965, 600, 90, [16]);
        ctx.fill();
        ctx.strokeStyle = '#dfba73';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('📶', 175, 1022);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('Complimentary High-Speed Wi-Fi', 215, 1005);

        ctx.fillStyle = '#475569';
        ctx.font = '15px sans-serif';
        ctx.fillText('Network: Shoreline Vista_Guest   •   Password: Pass@999', 215, 1032);

        // 8. Footer Line
        ctx.strokeStyle = '#dfba73';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(90, 1095);
        ctx.lineTo(160, 1095);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(690, 1095);
        ctx.lineTo(760, 1095);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.fillText('Hotel Shoreline Vista  •  Freshly Prepared & Delivered to Your Room', 425, 1100);

        // 9. Bottom Waves Accent
        ctx.fillStyle = '#0e1a2f';
        ctx.beginPath();
        ctx.roundRect(40, 1140, 770, 70, [0, 0, 16, 16]);
        ctx.fill();

        ctx.strokeStyle = '#dfba73';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(40, 1140);
        ctx.lineTo(810, 1140);
        ctx.stroke();

        ctx.fillStyle = '#dfba73';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('WAVES MULTICUISINE RESTAURANT & BAR  •  SHORELINE VISTA', 425, 1180);

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

  // Download Print-Ready PDF Card (Shoreline-Vista-Room-201-QR-Card.pdf)
  const handleDownloadPdfCard = () => {
    if (!selectedRoom) return;
    const fileName = `Shoreline-Vista-Room-${selectedRoom.roomNumber}-QR-Card.pdf`;
    const link = document.createElement('a');
    if (selectedRoom.roomNumber === '201') {
      link.href = '/Shoreline-Vista-Room-201-QR-Card.pdf';
    } else {
      link.href = `http://localhost:5001/api/guest/room/card-pdf/${selectedRoom.roomNumber}`;
    }
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading ${fileName}...`);
  };

  // Download Hotel Wi-Fi Tent Card (Matching User's Physical Tent Card)
  const handleDownloadWifiStandeeCard = async () => {
    let currentWifiQr = wifiQrDataUrl;
    if (!currentWifiQr) {
      currentWifiQr = await generateWifiQr();
    }
    if (!currentWifiQr) return;

    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 1050;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Warm Luxury Border
    ctx.strokeStyle = '#dfba73';
    ctx.lineWidth = 6;
    ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

    const logoImg = new Image();
    const qrImg = new Image();

    let imagesLoaded = 0;
    const onBothLoaded = () => {
      imagesLoaded++;
      if (imagesLoaded === 2) {
        // Draw SV Logo
        try {
          ctx.drawImage(logoImg, 305, 55, 90, 90);
        } catch {}

        // Hotel Name Header
        ctx.fillStyle = '#8c6527';
        ctx.font = 'bold 16px serif';
        ctx.textAlign = 'center';
        ctx.fillText('SHORELINE VISTA', 350, 168);

        // Elegant Script Wifi text with icon
        ctx.fillStyle = '#1e293b';
        ctx.font = 'italic bold 52px serif';
        ctx.fillText('Wifi 📶', 350, 240);

        // NETWORK Box
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('NETWORK:', 350, 300);

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(110, 315, 480, 60, [10]);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('Shoreline Vista_Guest', 350, 353);

        // PASSWORD Box
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('PASSWORD:', 350, 415);

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(110, 430, 480, 60, [10]);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 24px monospace';
        ctx.fillText('Pass@999', 350, 468);

        // Scannable Wi-Fi QR Code Box
        ctx.drawImage(qrImg, 185, 520, 330, 330);

        // Under QR Code: SCAN TO CONNECT
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('SCAN TO CONNECT', 350, 895);

        // Subtitle
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText('Complimentary High-Speed Guest Internet • Hotel Shoreline Vista', 350, 940);

        const link = document.createElement('a');
        link.download = `Hotel_Shoreline_Vista_WiFi_Tent_Card.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Downloaded Hotel Wi-Fi Tent Card (PNG)');
      }
    };

    logoImg.onload = onBothLoaded;
    logoImg.onerror = onBothLoaded;
    qrImg.onload = onBothLoaded;
    qrImg.onerror = onBothLoaded;

    logoImg.src = '/logo.png';
    qrImg.src = currentWifiQr;
  };

  // Download 2-in-1 Combined Card (Dining Order QR + Wi-Fi QR)
  const handleDownloadCombinedCard = async () => {
    if (!qrDataUrl || !selectedRoom) return;
    let currentWifiQr = wifiQrDataUrl;
    if (!currentWifiQr) {
      currentWifiQr = await generateWifiQr();
    }

    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#dfba73';
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOTEL SHORELINE VISTA', 450, 75);

    ctx.fillStyle = '#8c6527';
    ctx.font = 'bold 36px serif';
    ctx.fillText('WAVES', 450, 118);

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('MULTICUISINE BAR AND RESTAURANT', 450, 148);

    // Room Box
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(270, 175, 360, 80, [16]);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(getFloorPremiumLabel(selectedRoom.floor).toUpperCase(), 450, 202);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`ROOM ${selectedRoom.roomNumber}`, 450, 240);

    // Load QR images
    const diningQr = new Image();
    const wifiQr = new Image();

    let loadedCount = 0;
    const onBothQrLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        // Left Column: Dining
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(70, 280, 360, 480, [16]);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#8c6527';
        ctx.font = 'bold 20px serif';
        ctx.fillText('In-Room Dining', 250, 320);

        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.fillText('Scan to order Food & Drinks', 250, 345);

        ctx.drawImage(diningQr, 115, 370, 270, 270);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('ORDER TO ROOM', 250, 680);

        // Right Column: Wi-Fi
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(470, 280, 360, 480, [16]);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 20px serif';
        ctx.fillText('High-Speed Wi-Fi', 650, 320);

        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.fillText('Scan with camera to connect', 650, 345);

        if (currentWifiQr) {
          ctx.drawImage(wifiQr, 515, 370, 270, 270);
        }

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('SCAN TO CONNECT', 650, 680);

        // Credentials Footer
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.roundRect(100, 790, 700, 110, [14]);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('Wi-Fi Credentials', 450, 830);

        ctx.fillStyle = '#334155';
        ctx.font = '16px sans-serif';
        ctx.fillText('Network: Shoreline Vista_Guest    •    Password: Pass@999', 450, 870);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText('Hotel Shoreline Vista • Freshly Prepared & Delivered to Your Room', 450, 950);

        const link = document.createElement('a');
        link.download = `Room_${selectedRoom.roomNumber}_2in1_Dining_and_WiFi_Card.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success(`Generated 2-in-1 Card for Room ${selectedRoom.roomNumber}`);
      }
    };

    diningQr.onload = onBothQrLoaded;
    diningQr.onerror = onBothQrLoaded;
    wifiQr.onload = onBothQrLoaded;
    wifiQr.onerror = onBothQrLoaded;

    diningQr.src = qrDataUrl;
    wifiQr.src = currentWifiQr || '';
  };

  // Dispatch card download based on active tab
  const handleDownloadActiveTabCard = () => {
    if (standeeTab === 'wifi') {
      handleDownloadWifiStandeeCard();
    } else if (standeeTab === 'combined') {
      handleDownloadCombinedCard();
    } else {
      handleDownloadStandeeCard();
    }
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
            Manage hotel rooms, check live status, and generate printable QR standees and Wi-Fi tent cards.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleOpenWifiTentCard}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-sm"
            title="Generate & print standalone Wi-Fi tent cards for rooms or reception"
          >
            <Wifi className="w-4 h-4 text-amber-400" />
            <span>Hotel Wi-Fi Tent Card</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Room</span>
          </button>
        </div>
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
                      <span className="text-xs text-amber-400/90 font-medium bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                        {getFloorPremiumLabel(room.floor)}
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
      {/* MODAL 1: QR CODE STUDIO & DOWNLOAD CARD (DINING / WI-FI)   */}
      {/* ========================================================== */}
      {isQrModalOpen && selectedRoom && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-4 sm:p-7 max-h-[92vh] overflow-y-auto space-y-4 sm:space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <QrCode className="w-4 h-4" />
                <span>Room QR & Wi-Fi Studio</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white mt-1">
                Room {selectedRoom.roomNumber} Standee Cards
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose a card format to preview, download high-res PNG, or print for Room {selectedRoom.roomNumber}.
              </p>
            </div>

            {/* Standee Tab Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setStandeeTab('dining')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                  standeeTab === 'dining'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🍽️ Dining Card</span>
              </button>

              <button
                type="button"
                onClick={() => setStandeeTab('wifi')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                  standeeTab === 'wifi'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Wi-Fi Tent Card</span>
              </button>

              <button
                type="button"
                onClick={() => setStandeeTab('combined')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                  standeeTab === 'combined'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>✨ 2-in-1 Dual</span>
              </button>
            </div>

            {/* TAB 1: IN-ROOM DINING CARD (MATCHING USER REFERENCE DESIGN) */}
            {standeeTab === 'dining' && (
              <div
                ref={printRef}
                className="printable-standee-area bg-gradient-to-b from-[#faf8f5] via-white to-[#f7f3eb] text-slate-900 p-4 sm:p-5 rounded-3xl border-2 border-[#dfba73]/50 text-center shadow-xl mx-auto w-full max-w-sm relative overflow-hidden animate-in fade-in duration-150"
              >
                {/* 1. Top Food & Delicacies Banner with Script Restaurant Overlay */}
                <div className="relative rounded-2xl overflow-hidden border border-[#dfba73]/80 shadow-md">
                  <img
                    src="/food-banner.jpg"
                    alt="Waves Restaurant & Bar"
                    className="w-full h-32 sm:h-36 object-cover"
                  />
                  {/* Left dark luxury gradient overlay for 'Restaurant' text */}
                  <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/45 to-transparent flex flex-col justify-center px-4 text-left">
                    <div className="flex items-center space-x-1.5 text-amber-300 mb-0.5">
                      <Utensils className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-[9px] font-serif uppercase tracking-widest text-amber-200">
                        Waves
                      </span>
                    </div>
                    <div className="font-serif italic font-bold text-3xl sm:text-4xl text-white tracking-tight drop-shadow-md">
                      Restaurant
                    </div>
                    <div className="text-[9px] font-bold tracking-widest text-white/95 uppercase mt-1 drop-shadow">
                      DINE  •  RELAX  •  ENJOY
                    </div>
                  </div>
                </div>

                {/* 2. Room Number Box with Premium Room Badge */}
                <div className="mt-3.5 mb-2 py-2 px-6 bg-[#0e1a2f] border border-[#dfba73]/70 text-white rounded-2xl inline-block shadow-md">
                  <div className="text-[10px] uppercase tracking-widest font-black text-[#dfba73]">
                    PREMIUM ROOM
                  </div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                    ROOM {selectedRoom.roomNumber}
                  </div>
                </div>

                {/* 3. Floor Title Line: e.g. "Second Floor Premium" (without floor or suite words) */}
                <div className="flex items-center justify-center space-x-3 my-1.5 px-3">
                  <div className="h-px bg-gradient-to-r from-transparent via-[#dfba73] to-[#dfba73] flex-1" />
                  <span className="text-xs sm:text-sm font-bold text-[#8c6527] font-serif tracking-wider uppercase">
                    {getFloorPremiumLabel(selectedRoom.floor)}
                  </span>
                  <div className="h-px bg-gradient-to-l from-transparent via-[#dfba73] to-[#dfba73] flex-1" />
                </div>

                {/* 4. Two Feature Badges: Restaurant & Room Service */}
                <div className="grid grid-cols-2 gap-2 my-2 py-2 border-y border-[#ebd9b8]/60 text-left">
                  <div className="flex items-center space-x-2 pl-2">
                    <div className="w-8 h-8 rounded-full border border-stone-300 flex items-center justify-center shrink-0 bg-stone-50">
                      <UtensilsCrossed className="w-4 h-4 text-stone-800" />
                    </div>
                    <div className="leading-tight">
                      <div className="text-xs font-bold text-stone-900">Restaurant</div>
                      <div className="text-[9px] text-stone-500">Multi-cuisine Delights</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pl-2 border-l border-stone-200">
                    <div className="w-8 h-8 rounded-full border border-stone-300 flex items-center justify-center shrink-0 bg-stone-50">
                      <BedDouble className="w-4 h-4 text-stone-800" />
                    </div>
                    <div className="leading-tight">
                      <div className="text-xs font-bold text-stone-900">Room Service</div>
                      <div className="text-[9px] text-stone-500">Enjoy Comfort, In-Room</div>
                    </div>
                  </div>
                </div>

                {/* 5. Scan Prompt */}
                <div className="my-1.5">
                  <div className="text-xs sm:text-sm font-bold text-stone-900">
                    Scan with your phone camera
                  </div>
                  <div className="text-[11px] text-stone-500">
                    to view the menu & order in-room food & drinks
                  </div>
                </div>

                {/* 6. QR Code with Left & Right Radiating Gold Rays */}
                <div className="flex items-center justify-center space-x-2.5 my-2">
                  {/* Left rays */}
                  <div className="text-[#dfba73] font-bold select-none text-base tracking-widest leading-none transform -rotate-12">
                    \ | /
                  </div>

                  <div className="p-2 bg-white rounded-2xl border border-stone-200 shadow-sm inline-block">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`Room ${selectedRoom.roomNumber} QR`}
                        className="w-36 sm:w-44 h-36 sm:h-44 mx-auto"
                      />
                    ) : (
                      <div className="w-36 sm:w-44 h-36 sm:h-44 flex items-center justify-center text-xs text-stone-400">
                        Generating QR...
                      </div>
                    )}
                  </div>

                  {/* Right rays */}
                  <div className="text-[#dfba73] font-bold select-none text-base tracking-widest leading-none transform rotate-12">
                    \ | /
                  </div>
                </div>

                {/* 7. Wi-Fi Box */}
                <div className="mt-2 p-2.5 bg-[#fffdfa] rounded-xl text-[11px] text-stone-700 border border-[#dfba73]/60 flex items-center space-x-2 text-left shadow-xs">
                  <Wifi className="w-5 h-5 text-stone-900 shrink-0" />
                  <div>
                    <div className="font-bold text-stone-900 text-[11px]">
                      Complimentary High-Speed Wi-Fi
                    </div>
                    <div className="text-[10px] text-stone-600">
                      Network: <span className="font-bold">Shoreline Vista_Guest</span> • Password: <span className="font-bold font-mono">Pass@999</span>
                    </div>
                  </div>
                </div>

                {/* 8. Footer Line */}
                <div className="flex items-center justify-center space-x-2 my-2 text-[9px] text-stone-500 font-medium">
                  <div className="h-px bg-[#dfba73]/50 w-6" />
                  <span>Hotel Shoreline Vista • Freshly Prepared & Delivered to Your Room</span>
                  <div className="h-px bg-[#dfba73]/50 w-6" />
                </div>

                {/* 9. Bottom Ocean Waves Decorative Curves */}
                <div className="-mx-5 -mb-5 mt-2 h-7 bg-gradient-to-r from-[#0d1e38] via-[#1a3860] to-[#0d1e38] rounded-b-2xl relative overflow-hidden flex items-center justify-center">
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#dfba73] to-transparent" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#dfba73]/90 font-serif">
                    Shoreline Vista • Waves
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: HOTEL WI-FI TENT CARD (EXACT REPLICA OF PHYSICAL PHOTO) */}
            {standeeTab === 'wifi' && (
              <div
                ref={printRef}
                className="printable-standee-area bg-white text-slate-900 p-5 sm:p-7 rounded-2xl border-2 border-[#dfba73]/40 text-center shadow-xl mx-auto w-full max-w-sm animate-in fade-in duration-150"
              >
                {/* SV Golden Logo */}
                <img
                  src="/logo.png"
                  alt="Hotel Shoreline Vista"
                  className="h-14 mx-auto mb-1 object-contain"
                />
                <div className="text-[10px] uppercase font-bold tracking-widest text-[#8c6527] font-serif">
                  SHORELINE VISTA
                </div>

                {/* Wifi script heading with icon */}
                <div className="flex items-center justify-center gap-2 my-2">
                  <span className="font-serif italic font-bold text-3xl sm:text-4xl text-stone-900 tracking-tight">
                    Wifi
                  </span>
                  <Wifi className="w-7 h-7 text-stone-900 stroke-[2.5]" />
                </div>

                {/* Network box */}
                <div className="mt-3 text-left">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-1">
                    NETWORK:
                  </div>
                  <div className="p-2 sm:p-2.5 bg-white border border-stone-400 rounded-md text-center font-bold text-xs sm:text-sm text-stone-900 tracking-wide shadow-xs">
                    Shoreline Vista_Guest
                  </div>
                </div>

                {/* Password box */}
                <div className="mt-2.5 text-left">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-1">
                    PASSWORD:
                  </div>
                  <div className="p-2 sm:p-2.5 bg-white border border-stone-400 rounded-md text-center font-bold font-mono text-xs sm:text-sm text-stone-900 tracking-wide shadow-xs">
                    Pass@999
                  </div>
                </div>

                {/* Scannable Wi-Fi QR Code */}
                <div className="my-3 p-2 bg-white inline-block">
                  {wifiQrDataUrl ? (
                    <img
                      src={wifiQrDataUrl}
                      alt="Shoreline Vista Wi-Fi QR"
                      className="w-40 sm:w-44 h-40 sm:h-44 mx-auto"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-400">
                      Generating Wi-Fi QR...
                    </div>
                  )}
                </div>

                <div className="text-xs font-black tracking-widest text-stone-900 uppercase">
                  SCAN TO CONNECT
                </div>

                <div className="mt-2 text-[10px] text-stone-400 font-medium">
                  Complimentary High-Speed Internet • Hotel Shoreline Vista
                </div>
              </div>
            )}

            {/* TAB 3: 2-IN-1 DUAL STANDEE (DINING + WI-FI) */}
            {standeeTab === 'combined' && (
              <div
                ref={printRef}
                className="printable-standee-area bg-white text-slate-900 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 text-center shadow-lg mx-auto w-full max-w-md animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-2 text-left">
                    <img
                      src="/logo.png"
                      alt="Hotel Shoreline Vista"
                      className="h-10 object-contain rounded-lg"
                    />
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        HOTEL SHORELINE VISTA
                      </div>
                      <div className="text-xs font-black text-[#8c6527] font-serif uppercase">
                        WAVES MULTICUISINE
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-bold text-amber-600 uppercase">
                      {getFloorPremiumLabel(selectedRoom.floor)}
                    </div>
                    <div className="text-base font-black text-slate-950">ROOM {selectedRoom.roomNumber}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 my-3">
                  {/* Left: Dining QR */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-[11px] font-bold text-[#8c6527] uppercase">
                      🍽️ Food & Drinks
                    </div>
                    <div className="my-1.5 p-1 bg-white rounded-lg inline-block shadow-xs">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Dining QR"
                          className="w-28 sm:w-32 h-28 sm:h-32 mx-auto"
                        />
                      ) : (
                        <div className="w-28 h-28 flex items-center justify-center text-[10px] text-slate-400">
                          Loading...
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-black uppercase text-slate-800">
                      Scan to Order
                    </div>
                  </div>

                  {/* Right: Wi-Fi QR */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-[11px] font-bold text-stone-900 uppercase">
                      📶 Guest Wi-Fi
                    </div>
                    <div className="my-1.5 p-1 bg-white rounded-lg inline-block shadow-xs">
                      {wifiQrDataUrl ? (
                        <img
                          src={wifiQrDataUrl}
                          alt="Wi-Fi QR"
                          className="w-28 sm:w-32 h-28 sm:h-32 mx-auto"
                        />
                      ) : (
                        <div className="w-28 h-28 flex items-center justify-center text-[10px] text-slate-400">
                          Loading...
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-black uppercase text-slate-800">
                      Scan to Connect
                    </div>
                  </div>
                </div>

                {/* Wi-Fi Details Box */}
                <div className="p-2.5 bg-slate-100 rounded-xl text-left border border-slate-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Network:</span>
                    <span className="font-bold text-slate-900 font-mono">Shoreline Vista_Guest</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/80">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Password:</span>
                    <span className="font-bold text-slate-900 font-mono">Pass@999</span>
                  </div>
                </div>
              </div>
            )}

            {/* Studio Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Primary PDF Download */}
              <button
                onClick={handleDownloadPdfCard}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-[#dfba73] hover:from-amber-400 hover:to-[#ebd9b8] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer sm:col-span-2"
                title="Download print-ready official PDF standee card"
              >
                <FileText className="w-4 h-4 text-slate-950" />
                <span>
                  Download Official Standee PDF (Shoreline-Vista-Room-{selectedRoom.roomNumber}-QR-Card.pdf)
                </span>
              </button>

              <button
                onClick={handleDownloadActiveTabCard}
                className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {standeeTab === 'wifi'
                    ? 'Download Wi-Fi Tent Card (PNG)'
                    : standeeTab === 'combined'
                    ? 'Download 2-in-1 Card (PNG)'
                    : 'Download Dining Card (PNG)'}
                </span>
              </button>

              <button
                onClick={handleDownloadQrPng}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>
                  {standeeTab === 'wifi' ? 'Download Wi-Fi QR (PNG)' : 'Download Raw QR (PNG)'}
                </span>
              </button>

              <button
                onClick={handlePrintStandee}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all cursor-pointer sm:col-span-2"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>
                  {standeeTab === 'wifi'
                    ? 'Print Wi-Fi Tent Card'
                    : standeeTab === 'combined'
                    ? 'Print 2-in-1 Dual Standee'
                    : 'Print Dining Standee Card'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 1B: STANDALONE HOTEL WI-FI TENT CARD MODAL           */}
      {/* ========================================================== */}
      {isWifiOnlyModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-5 sm:p-8 max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsWifiOnlyModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Wifi className="w-4 h-4" />
                <span>Official Hotel Wi-Fi Tent Card</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Hotel Shoreline Vista Wi-Fi Card
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Print or download high-resolution tent cards to place on reception desks, restaurant tables, and guest rooms.
              </p>
            </div>

            {/* Exact Replica of Physical Hotel Tent Card */}
            <div
              ref={wifiPrintRef}
              className="printable-wifi-area bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border-2 border-[#dfba73]/50 text-center shadow-xl mx-auto w-full max-w-sm"
            >
              {/* SV Golden Logo */}
              <img
                src="/logo.png"
                alt="Hotel Shoreline Vista"
                className="h-16 mx-auto mb-1 object-contain"
              />
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#8c6527] font-serif">
                SHORELINE VISTA
              </div>

              {/* Wifi Script heading with icon */}
              <div className="flex items-center justify-center gap-2 my-2.5">
                <span className="font-serif italic font-bold text-3xl sm:text-4xl text-stone-900 tracking-tight">
                  Wifi
                </span>
                <Wifi className="w-7 h-7 text-stone-900 stroke-[2.5]" />
              </div>

              {/* NETWORK: box */}
              <div className="mt-3 text-left">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-1">
                  NETWORK:
                </div>
                <div className="p-2.5 bg-white border border-stone-400 rounded-md text-center font-bold text-xs sm:text-sm text-stone-900 tracking-wide shadow-xs">
                  Shoreline Vista_Guest
                </div>
              </div>

              {/* PASSWORD: box */}
              <div className="mt-2.5 text-left">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-1">
                  PASSWORD:
                </div>
                <div className="p-2.5 bg-white border border-stone-400 rounded-md text-center font-bold font-mono text-xs sm:text-sm text-stone-900 tracking-wide shadow-xs">
                  Pass@999
                </div>
              </div>

              {/* QR Code */}
              <div className="my-3 p-2 bg-white inline-block">
                {wifiQrDataUrl ? (
                  <img
                    src={wifiQrDataUrl}
                    alt="Shoreline Vista Wi-Fi QR"
                    className="w-44 sm:w-48 h-44 sm:h-48 mx-auto"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                    Generating Wi-Fi QR...
                  </div>
                )}
              </div>

              <div className="text-xs font-black tracking-widest text-stone-900 uppercase">
                SCAN TO CONNECT
              </div>

              <div className="mt-2 text-[10px] text-stone-400 font-medium">
                Complimentary High-Speed Internet • Hotel Shoreline Vista
              </div>
            </div>

            {/* Wi-Fi Modal Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDownloadWifiStandeeCard}
                className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Tent Card (PNG)</span>
              </button>

              <button
                onClick={handleDownloadWifiQrPng}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>Download Wi-Fi QR (PNG)</span>
              </button>

              <button
                onClick={() => window.print()}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all cursor-pointer sm:col-span-2"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>Print Wi-Fi Tent Card</span>
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
