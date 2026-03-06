const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, name: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  getProfile: () => request('/auth/profile'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  // Rooms
  createRoom: (data: any) =>
    request('/rooms', { method: 'POST', body: JSON.stringify(data) }),
  getRooms: () => request('/rooms'),
  getRoom: (id: string) => request(`/rooms/${id}`),
  getPublicRoom: (code: string) => request(`/rooms/join/${code}`),
  closeRegistration: (id: string) =>
    request(`/rooms/${id}/close`, { method: 'PATCH' }),
  startDraw: (id: string) =>
    request(`/rooms/${id}/start-draw`, { method: 'PATCH' }),
  updateRoom: (id: string, data: any) =>
    request(`/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  resetRoom: (id: string) =>
    request(`/rooms/${id}/reset`, { method: 'PATCH' }),

  // Participants
  registerParticipant: (roomCode: string, data: Record<string, any>) =>
    request(`/participants/${roomCode}/register`, { method: 'POST', body: JSON.stringify(data) }),
  getParticipants: (roomId: string) => request(`/participants/${roomId}`),

  // Draws
  drawPrize: (roomId: string, prizeId: string) =>
    request(`/draws/${roomId}/prize/${prizeId}`, { method: 'POST' }),
  getResults: (roomId: string) => request(`/draws/${roomId}/results`),

  // Uploads
  uploadFile: async (file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/api/uploads`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || 'Upload failed');
    }

    return res.json();
  },

  // Export
  getFileUrl: (path: string) => `${API_URL}${path}`,
};
