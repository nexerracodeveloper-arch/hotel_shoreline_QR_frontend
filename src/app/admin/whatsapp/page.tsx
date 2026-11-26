'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  MessageCircle,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Send,
  Save,
  Users,
  User,
  Bell,
  Smartphone,
  Info,
  Check,
  ShieldAlert,
} from 'lucide-react';

interface GroupInfo {
  id: string;
  name: string;
  participantsCount: number;
}

interface WhatsAppSettings {
  enabled: boolean;
  targetType: 'master_admin' | 'both_numbers' | 'group' | 'self' | 'custom';
  targetJid: string;
  targetName: string;
  masterAdminPhone?: string; // Number 1: Entered in Master Admin form
  orderDeskPhone?: string;   // Number 2: Connected / designated for Room Order Desk
  customPhone?: string;
  notifyOnServiceRequests: boolean;
}

interface WhatsAppStatusData {
  status: 'DISCONNECTED' | 'INITIALIZING' | 'QR_READY' | 'CONNECTING' | 'CONNECTED';
  qrCode: string | null;
  phoneNumber: string | null;
  userName: string | null;
  connectedAt: string | null;
  lastError: string | null;
  settings: WhatsAppSettings;
  groups: GroupInfo[];
}

export default function AdminWhatsAppPage() {
  const [data, setData] = useState<WhatsAppStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Editable settings form state
  const [enabled, setEnabled] = useState(true);
  const [targetType, setTargetType] = useState<'master_admin' | 'both_numbers' | 'group' | 'self' | 'custom'>('master_admin');
  const [targetJid, setTargetJid] = useState('');
  const [masterAdminPhone, setMasterAdminPhone] = useState('');
  const [orderDeskPhone, setOrderDeskPhone] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [notifyOnServiceRequests, setNotifyOnServiceRequests] = useState(true);

  const fetchStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res: any = await api.admin.getWhatsAppStatus();
      if (res && res.success) {
        setData(res);
        if (res.settings) {
          setEnabled(res.settings.enabled ?? true);
          setTargetType(res.settings.targetType ?? 'master_admin');
          setTargetJid(res.settings.targetJid ?? '');
          setMasterAdminPhone(res.settings.masterAdminPhone ?? '');
          setOrderDeskPhone(res.settings.orderDeskPhone ?? '');
          setCustomPhone(res.settings.customPhone ?? '');
          setNotifyOnServiceRequests(res.settings.notifyOnServiceRequests ?? true);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch WhatsApp status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Listen to real-time status updates from backend socket
    const socket = getSocket();
    const handleStatusUpdate = (updated: any) => {
      setData((prev) => ({ ...prev, ...updated }));
      if (updated.settings) {
        setEnabled(updated.settings.enabled ?? true);
        setTargetType(updated.settings.targetType ?? 'master_admin');
        setTargetJid(updated.settings.targetJid ?? '');
        setMasterAdminPhone(updated.settings.masterAdminPhone ?? '');
        setOrderDeskPhone(updated.settings.orderDeskPhone ?? '');
        setCustomPhone(updated.settings.customPhone ?? '');
        setNotifyOnServiceRequests(updated.settings.notifyOnServiceRequests ?? true);
      }
    };

    socket.on('whatsapp:status', handleStatusUpdate);

    // Auto-poll every 5 seconds if waiting for QR scan
    const interval = setInterval(() => {
      if (data?.status === 'QR_READY' || data?.status === 'INITIALIZING') {
        fetchStatus(true);
      }
    }, 5000);

    return () => {
      socket.off('whatsapp:status', handleStatusUpdate);
      clearInterval(interval);
    };
  }, [fetchStatus, data?.status]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const selectedGroup = data?.groups.find((g) => g.id === targetJid);
      await api.admin.updateWhatsAppSettings({
        enabled,
        targetType,
        targetJid,
        targetName: selectedGroup ? selectedGroup.name : '',
        masterAdminPhone,
        orderDeskPhone,
        customPhone,
        notifyOnServiceRequests,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await fetchStatus(true);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res: any = await api.admin.sendWhatsAppTest();
      if (res.success) {
        setTestResult({
          success: true,
          message: `Test alert sent successfully to ${res.target}! Check your phone for the notification.`,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Failed to send test message.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error executing test send.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    setLoading(true);
    try {
      await api.admin.logoutWhatsApp();
      await fetchStatus();
    } catch (err: any) {
      alert(`Logout error: ${err.message}`);
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setRefreshing(true);
    try {
      await api.admin.restartWhatsApp();
      await fetchStatus();
    } catch (err: any) {
      alert(`Restart error: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const isConnected = data?.status === 'CONNECTED';
  const isQrReady = data?.status === 'QR_READY' && !!data.qrCode;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-amber-900/30 pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 border border-emerald-500/30 rounded-2xl text-emerald-400">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                Hotel Shoreline Vista • In-Room Dining
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                WhatsApp Order Alerts
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            Connect your WhatsApp to receive instant, automated order notifications whenever an in-room dining
            order or housekeeping request is submitted.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchStatus()}
            disabled={refreshing}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Status'}</span>
          </button>

          {isConnected && (
            <button
              onClick={() => setShowLogoutModal(true)}
              className="px-4 py-2 rounded-xl bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 text-red-300 hover:text-red-200 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Unlink WhatsApp</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: QR Code / Connection Status (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-amber-900/30 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            {/* Status Pill */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Connection Status
              </span>
              {isConnected ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Linked & Active</span>
                </span>
              ) : isQrReady ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Awaiting QR Scan</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Initializing...</span>
                </span>
              )}
            </div>

            {/* When Connected */}
            {isConnected ? (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">WhatsApp Connected</h3>
                    <p className="text-xs text-emerald-400 font-mono mt-0.5">
                      +{data?.phoneNumber || 'Admin Phone'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {data?.userName || 'Shoreline Vista Admin Account'}
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-emerald-500/20">
                    Connected at:{' '}
                    <span className="text-slate-300 font-medium">
                      {data?.connectedAt ? new Date(data.connectedAt).toLocaleTimeString() : 'Active'}
                    </span>
                  </div>
                </div>

                {/* Helpful Tip about the Single-Number Solution */}
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                  <div className="flex items-start space-x-2.5">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        One-Phone-Number Tip
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        To guarantee a <strong>loud ringtone and push notification</strong> on this same phone,
                        create a WhatsApp Group (e.g.{' '}
                        <code className="text-amber-300 font-mono">🛎️ Shoreline Vista - Orders</code>) where you are
                        the only member, and select it on the right!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : isQrReady ? (
              /* When QR is ready to scan */
              <div className="space-y-6 text-center">
                <div className="p-4 bg-white rounded-2xl inline-block shadow-2xl border-4 border-amber-500/30">
                  <img
                    src={data.qrCode!}
                    alt="Scan WhatsApp QR Code"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto"
                  />
                </div>

                <div className="text-left space-y-2.5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                  <p className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>How to Link in 10 Seconds:</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                    <li>Open <strong>WhatsApp</strong> on your phone.</li>
                    <li>Tap <strong>Settings</strong> (or 3-dots on Android) &rarr; <strong>Linked Devices</strong>.</li>
                    <li>Tap <strong>Link a Device</strong>.</li>
                    <li>Point your phone camera at the QR code above.</li>
                  </ol>
                </div>

                <button
                  onClick={handleRestart}
                  className="text-xs text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                >
                  QR code expired? Click to generate a fresh QR code
                </button>
              </div>
            ) : (
              /* Loading / Initializing */
              <div className="py-16 text-center space-y-4">
                <div className="p-4 rounded-full bg-slate-800 text-amber-400 inline-block animate-pulse">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Generating WhatsApp Pairing QR...</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Establishing multi-device session with WhatsApp Web socket.
                  </p>
                </div>
                <button
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings & Live Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Settings Card */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-amber-900/30 shadow-2xl space-y-6 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Alert Delivery Settings</h2>
                  <p className="text-xs text-slate-400">
                    Choose where Shoreline Vista room orders are delivered.
                  </p>
                </div>
              </div>

              {/* Master Enabled Toggle */}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                <span className="text-xs font-bold text-slate-300">
                  {enabled ? 'Alerts ON' : 'Alerts OFF'}
                </span>
              </label>
            </div>

            {/* 2-Number Architecture Workflow Card */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>2-Number WhatsApp System Architecture</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                • <strong>Number 1 (Master Admin Form)</strong>: Enter your Master Admin WhatsApp number below. All incoming dining alerts are dispatched directly to this phone.<br />
                • <strong>Number 2 (Room Order Desk Session)</strong>: Room Order Desk staff connects their WhatsApp at <a href="/admin/order-desk" className="text-amber-400 underline font-bold hover:text-amber-300">/admin/order-desk</a> by scanning the pairing QR code.<br />
                • <strong>Automated Forwarding</strong>: Whenever a guest orders, the Order Desk's WhatsApp automatically forwards the order message to your Master Admin phone!
              </p>
            </div>

            {/* Field: Master Admin WhatsApp Number (Number 1) */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider block">
                Master Admin WhatsApp Number (Alert Recipient)
              </label>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-400 font-mono">
                  +91
                </span>
                <input
                  type="tel"
                  value={masterAdminPhone}
                  onChange={(e) => setMasterAdminPhone(e.target.value)}
                  placeholder="e.g. 9876543210 (10-digit number)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500 placeholder-slate-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Incoming guest room orders from the connected Room Order Desk WhatsApp will be delivered to this phone.
              </p>
            </div>

            {/* Target Mode Selector */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Notification Delivery Mode
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode 1: Master Admin Phone */}
                <button
                  type="button"
                  onClick={() => setTargetType('master_admin')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    targetType === 'master_admin'
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-bold text-white">Master Admin Phone</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sends directly from Room Order Desk to the Master Admin number entered above ({masterAdminPhone || 'Not set yet'}).
                  </p>
                </button>

                {/* Mode 2: Both Numbers */}
                <button
                  type="button"
                  onClick={() => setTargetType('both_numbers')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    targetType === 'both_numbers'
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">Both Numbers</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sends to Master Admin phone AND also stays in the Order Desk phone's chat.
                  </p>
                </button>

                {/* Mode 3: WhatsApp Group */}
                <button
                  type="button"
                  onClick={() => setTargetType('group')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    targetType === 'group'
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">WhatsApp Group</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Broadcasts orders to a shared WhatsApp Group with kitchen & staff.
                  </p>
                </button>

                {/* Mode 4: Custom Phone Number */}
                <button
                  type="button"
                  onClick={() => setTargetType('custom')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    targetType === 'custom'
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1.5">
                    <User className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">Custom Number</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Deliver orders to any other specific WhatsApp phone number.
                  </p>
                </button>
              </div>

              {/* Custom Phone Input (when Custom mode selected) */}
              {targetType === 'custom' && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Custom Recipient Phone Number:
                  </label>
                  <input
                    type="tel"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="e.g. 919876543210 (with country code)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Group Dropdown (when Group mode selected) */}
              {targetType === 'group' && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Select WhatsApp Group:
                    </label>
                    <button
                      type="button"
                      onClick={() => fetchStatus()}
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Reload Groups
                    </button>
                  </div>

                  {data?.groups && data.groups.length > 0 ? (
                    <select
                      value={targetJid}
                      onChange={(e) => setTargetJid(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="">-- Choose an Order Notification Group --</option>
                      {data.groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          👥 {group.name} ({group.participantsCount} members)
                        </option>
                      ))}
                    </select>
                  ) : isConnected ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      No groups found. Please create a group called{' '}
                      <strong>"🛎️ Shoreline Vista - Orders"</strong> on WhatsApp, then click "Reload Groups".
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Connect WhatsApp on the left to load your groups automatically.
                    </p>
                  )}
                </div>
              )}

              {/* Concierge Requests Checkbox */}
              <div className="pt-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnServiceRequests}
                    onChange={(e) => setNotifyOnServiceRequests(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs text-slate-300">
                    Also notify on <strong>Housekeeping & Concierge requests</strong> (e.g. Room Cleaning, Extra Towels)
                  </span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg disabled:opacity-50 w-full sm:w-auto"
                >
                  {saving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : saveSuccess ? (
                    <Check className="w-3.5 h-3.5 text-emerald-950" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{saveSuccess ? 'Settings Saved!' : saving ? 'Saving...' : 'Save Settings'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={testing || !isConnected}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-40 w-full sm:w-auto"
                  title={!isConnected ? 'Connect WhatsApp first' : 'Test notification sound'}
                >
                  <Send className={`w-3.5 h-3.5 ${testing ? 'animate-pulse text-amber-400' : ''}`} />
                  <span>{testing ? 'Sending Test...' : 'Send Test Alert'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`text-xs p-2.5 rounded-xl border flex items-center space-x-2 ${
                    testResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-950/40 border-red-500/30 text-red-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Message Preview Card */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-amber-900/30 shadow-2xl space-y-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Live WhatsApp Message Preview
              </span>
              <span className="text-[10px] text-amber-400 font-medium">
                Sent to your phone in milliseconds
              </span>
            </div>

            {/* Simulated WhatsApp Bubble */}
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#202c33] text-slate-200 font-sans text-xs space-y-2 shadow-inner max-w-md mx-auto">
              <div className="flex items-center justify-between border-b border-[#202c33] pb-2 text-[11px] text-emerald-400 font-mono font-bold">
                <span>🛎️ HOTEL SHORELINE VISTA — NEW ORDER!</span>
              </div>
              <div className="space-y-0.5 text-slate-300 font-mono text-[11px]">
                <p>📋 <strong className="text-white">Order:</strong> #1042</p>
                <p>🚪 <strong className="text-amber-400">Room:</strong> <strong className="text-white">Room 204</strong></p>
                <p>👤 <strong className="text-white">Guest:</strong> Rohit Sharma (+91 98765 43210)</p>
                <p>⏰ <strong className="text-white">Time:</strong> 11:28 AM</p>
              </div>
              <div className="border-t border-[#202c33] pt-2 space-y-1 font-mono text-[11px]">
                <p className="text-amber-300 font-bold">🍴 ORDERED ITEMS:</p>
                <p>• <strong>2x</strong> Shoreline Vista Special Prawns Ghee Roast — ₹900</p>
                <p>• <strong>1x</strong> Neer Dosa (4 pcs) — ₹120</p>
                <p>• <strong>2x</strong> Waves Bar Kingfisher Ultra — ₹640</p>
              </div>
              <div className="border-t border-[#202c33] pt-2 font-mono text-[11px] space-y-1">
                <p className="text-slate-400 italic">📝 <strong>Notes:</strong> "Extra spicy and serve drinks chilled first please."</p>
                <p className="text-amber-400 font-extrabold text-xs pt-1">
                  💰 TOTAL AMOUNT: ₹1,743
                </p>
              </div>
              <div className="text-[10px] text-slate-500 text-right pt-1">
                11:28 AM ✓✓
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="p-6 rounded-3xl bg-slate-900 border border-red-500/30 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Unlink WhatsApp?</h3>
              <p className="text-xs text-slate-400 mt-1">
                This will disconnect the current WhatsApp session. You will need to scan a new QR code to resume
                receiving order alerts.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer shadow-lg shadow-red-600/30"
              >
                Unlink Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
