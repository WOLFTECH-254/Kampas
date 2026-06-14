import { io } from 'socket.io-client';

const getToken = () => localStorage.getItem('kampas_token') ?? '';

export const socket = io({
  autoConnect: false,
  auth: { token: getToken() },
});

export function connectSocket() {
  socket.auth = { token: getToken() };
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}
