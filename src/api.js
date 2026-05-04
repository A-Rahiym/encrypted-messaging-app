const BASE = 'https://whisperbox.koyeb.app';
import { store } from './store.js';
async function request(path, options = {}, retry = true) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (store.accessToken) headers['Authorization'] = `Bearer ${store.accessToken}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry && store.refreshToken) {
    const ok = await refreshTokens();
    if (ok) return request(path, options, false);
    store.clear();
    window.location.reload();
    return;
  }

  return res;
}

async function refreshTokens() {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: store.refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    store.accessToken = data.access_token;
    return true;
  } catch {
    return false;
  }
}


export async function register(payload) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Registration failed');
  return data;
}

export async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Invalid credentials');
  return data;
}

export async function logout() {
  await request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: store.refreshToken }),
  });
}



export async function searchUsers(q) {
  const res = await request(`/users/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getPublicKey(userId) {
  if (store.publicKeyCache[userId]) return store.publicKeyCache[userId];
  const res = await request(`/users/${userId}/public-key`);
  if (!res.ok) throw new Error('User not found');
  const { public_key } = await res.json();
  store.publicKeyCache[userId] = public_key;
  return public_key;
}



export async function getConversations() {
  const res = await request('/conversations');
  if (!res.ok) return [];
  return res.json();
}

export async function getMessages(userId, limit = 50, before = null) {
  let url = `/conversations/${userId}/messages?limit=${limit}`;
  if (before) url += `&before=${encodeURIComponent(before)}`;
  const res = await request(url);
  if (!res.ok) return [];
  return res.json();
}

export async function sendMessageHTTP(toUserId, payload) {
  const res = await request('/messages', {
    method: 'POST',
    body: JSON.stringify({ to: toUserId, payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Send failed');
  return data;
}



export function connectWS(onMessage, onPresence) {
  if (store.ws && store.ws.readyState < 2) store.ws.close();

  const ws = new WebSocket(`wss://whisperbox.koyeb.app/ws?token=${store.accessToken}`);
  store.ws = ws;

  ws.onmessage = (e) => {
    try {
      const frame = JSON.parse(e.data);
      if (frame.event === 'message.receive') onMessage(frame);
      if (frame.event === 'user.online' || frame.event === 'user.offline') onPresence(frame);
    } catch { /* ignore malformed */ }
  };

  ws.onclose = (e) => {
    if (e.code !== 1000) {
      setTimeout(() => connectWS(onMessage, onPresence), 3000);
    }
  };

  ws.onerror = () => ws.close();

  return ws;
}

export function sendWS(to, payload) {
  if (!store.ws || store.ws.readyState !== WebSocket.OPEN) return false;
  store.ws.send(JSON.stringify({ event: 'message.send', to, payload }));
  return true;
}
