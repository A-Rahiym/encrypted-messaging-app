import { BASE_URL } from '../core/constants.js';
import { store } from '../core/store.js';

async function request(path, options = {}, retry = true) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (store.accessToken) headers.Authorization = `Bearer ${store.accessToken}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

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
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
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
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Registration failed');
  return data;
}

export async function login(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
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

export async function authMe() {
  const res = await request('/auth/me');
  if (!res.ok) throw new Error('Failed to restore session');
  return res.json();
}

export async function refreshAccessToken() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: store.refreshToken }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  store.accessToken = data.access_token;
  store.tokenExpiresAt = Date.now() + ((data.expires_in || 900) * 1000);
  return data;
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
