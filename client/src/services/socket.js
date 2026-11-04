import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket && socket.connected) {
    return socket;
  }

  // If previous socket exists but disconnected, disconnect clean
  if (socket) {
    socket.disconnect();
  }

  // Connect to backend origin
  const socketUrl =
    import.meta.env.VITE_SOCKET_URL ||
    (window.location.origin.includes(':5173')
      ? 'http://localhost:5000'
      : window.location.origin);

  socket = io(socketUrl, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected with ID:', socket.id);
  });

  socket.on('reconnect', (attempt) => {
    console.log('[Socket] Reconnected after', attempt, 'attempt(s)');
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
