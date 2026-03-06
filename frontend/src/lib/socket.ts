import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function joinRoom(roomCode: string) {
  const s = getSocket();
  s.emit('joinRoom', roomCode);
  return s;
}

export function leaveRoom(roomCode: string) {
  const s = getSocket();
  s.emit('leaveRoom', roomCode);
}
