const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://hotel-shoreline-qr-backend.onrender.com/api/v1';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('hotel_admin_token');
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hotel_admin_token', token);
  }
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hotel_admin_token');
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/room/')
    ) {
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: Request failed`);
  }

  return data as T;
}

export const api = {
  auth: {
    login: (body: { email: string; password: string }) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    getMe: () => request('/auth/me'),
  },

  guest: {
    getRoomInfo: (qrToken: string) => request(`/guest/room/${qrToken}`),
    placeOrder: (body: {
      qrToken: string;
      guestName?: string;
      guestPhone?: string;
      specialNotes?: string;
      items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
    }) => request('/guest/orders', { method: 'POST', body: JSON.stringify(body) }),
    getOrder: (id: string) => request(`/guest/orders/${id}`),
    submitRequest: (body: { qrToken: string; type: string; details?: string }) =>
      request('/guest/requests', { method: 'POST', body: JSON.stringify(body) }),
  },

  admin: {
    getAnalytics: () => request('/admin/analytics'),
    getRooms: () => request('/admin/rooms'),
    createRoom: (body: any) => request('/admin/rooms', { method: 'POST', body: JSON.stringify(body) }),
    updateRoom: (id: string, body: any) => request(`/admin/rooms/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteRoom: (id: string) => request(`/admin/rooms/${id}`, { method: 'DELETE' }),
    getRoomQr: (id: string) => request(`/admin/rooms/${id}/qr`),
    getBookings: () => request('/admin/bookings'),
    createBooking: (body: any) => request('/admin/bookings', { method: 'POST', body: JSON.stringify(body) }),
    updateBookingStatus: (id: string, status: string) =>
      request(`/admin/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    getCategories: () => request('/admin/menu/categories'),
    getMenuItems: (categoryId?: string) =>
      request(`/admin/menu/items${categoryId ? `?categoryId=${categoryId}` : ''}`),
    createMenuItem: (body: any) => request('/admin/menu/items', { method: 'POST', body: JSON.stringify(body) }),
    toggleStock: (id: string) => request(`/admin/menu/items/${id}/toggle-stock`, { method: 'PATCH' }),
    getOrders: (status?: string) => request(`/admin/orders${status ? `?status=${status}` : ''}`),
    updateOrderStatus: (id: string, status: string) =>
      request(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    getRequests: () => request('/admin/requests'),
    updateRequestStatus: (id: string, status: string) =>
      request(`/admin/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
};
