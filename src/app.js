// app.js — entry point, wires everything together

import { store } from './store.js';
import { initAuth } from './auth.js';
import { showView } from './ui.js';
import * as api from './api.js';
import * as chat from './chat.js';

console.log('App initialized');
async function onLoginSuccess() {
  showView('app');
  await chat.loadConversations();
  startWebSocket();
  chat.initSearch();
  chat.initLoadMore();
  chat.initBackButton();
  bindAppEvents();
}

function startWebSocket() {
  api.connectWS(
    async (frame) => {
      await chat.receiveMessage(frame);
    },
    (frame) => {
      if (frame.event === 'user.online') store.onlineUsers.add(frame.user_id);
      if (frame.event === 'user.offline') store.onlineUsers.delete(frame.user_id);
      chat.updatePresenceDot(frame.user_id, frame.event === 'user.online');
    }
  );
}

function bindAppEvents() {
  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    if (!confirm('Log out?')) return;
    try { await api.logout(); } catch { /* ignore */ }
    if (store.ws) store.ws.close(1000);
    store.clear();
    showView('auth');
    document.getElementById('input-username').value = '';
    document.getElementById('input-password').value = '';
  });


  const input = document.getElementById('msg-input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chat.sendMessage(input.value);
    }
  });


  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });

  document.getElementById('send-btn').addEventListener('click', () => {
    chat.sendMessage(input.value);
  });
}



showView('auth');
initAuth(onLoginSuccess);
