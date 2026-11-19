import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function resolveSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_API_URL);
      return url.origin;
    } catch {
      // ignore
    }
  }
  return 'https://hotel-shoreline-qr-backend.onrender.com';
}

export function getSocket(): Socket {
  if (!socket && typeof window !== 'undefined') {
    const socketUrl = resolveSocketUrl();
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket!;
}
