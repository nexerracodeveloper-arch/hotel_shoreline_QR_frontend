'use client';

import { useEffect, useState } from 'react';
import {
  BellRing,
  Sparkles,
  Droplets,
  BedDouble,
  Shirt,
  Wrench,
  PhoneCall,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getRequests();
      if (res.success) {
        setRequests(res.requests || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    const socket = getSocket();
    socket.on('request:new', (newReq: any) => {
      setRequests((prev) => [newReq, ...prev]);
      toast.info(`🛎️ New Service Request from Room ${newReq.roomNumber}: ${newReq.type}`);
    });

    socket.on('request:updated', (updated: any) => {
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    });

    return () => {
      socket.off('request:new');
      socket.off('request:updated');
    };
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await api.admin.updateRequestStatus(id, status);
      if (res.success) {
        toast.success(`Request marked as ${status}`);
        setRequests((prev) => prev.map((r) => (r.id === id ? res.request : r)));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update request');
    }
  };

  const getAmenityIcon = (type: string) => {
    switch (type) {
      case 'EXTRA_TOWELS':
      case 'TOILETRIES':
        return Sparkles;
      case 'BOTTLED_WATER':
        return Droplets;
      case 'HOUSEKEEPING':
        return BedDouble;
      case 'LAUNDRY':
        return Shirt;
      case 'MAINTENANCE':
        return Wrench;
      case 'CALL_RECEPTION':
        return PhoneCall;
      default:
        return BellRing;
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Housekeeping & Concierge Desk</h1>
          <p className="text-xs text-slate-400 mt-1">
            Incoming amenity and maintenance requests triggered directly from in-room QR codes.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              filter === f
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
          <p className="text-xs">Loading concierge desk requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
          No service requests found under {filter}.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const Icon = getAmenityIcon(req.type);

            return (
              <div
                key={req.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold font-mono text-xs">
                        ROOM {req.roomNumber || '—'}
                      </span>
                      <span className="font-bold text-sm text-white">
                        {req.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 mt-1">
                      {req.details || 'Guest requested standard service.'}
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        Requested at{' '}
                        {new Date(req.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase tracking-wider ${
                      req.status === 'RESOLVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : req.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {req.status}
                  </span>

                  {req.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'IN_PROGRESS')}
                      className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-semibold cursor-pointer"
                    >
                      Dispatch Staff
                    </button>
                  )}

                  {req.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'RESOLVED')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold cursor-pointer flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
