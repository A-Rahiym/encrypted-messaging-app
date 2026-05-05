// app.js — entry point, wires everything together

import { store } from './core/store.js';
import { initAuthUI } from './features/auth/auth.ui.js';
import { showView } from './utils/ui.js';
import * as api from './services/api.js';
import { connectWS } from './services/websocket.js';
import { loadConversations, initSearch, updatePresenceDot } from './features/chat/conversations.js';
import { bindBackButton, bindChatInput, bindLoadMore } from './features/chat/chat.ui.js';
import { loadMessages, receiveMessage, resetMessageState, sendMessage } from './features/chat/chat.js';

console.log('App initialized');
let appEventsBound = false;

async function onLoginSuccess() {
  showView('app');
  await loadConversations();
  startWebSocket();
  bindAppEvents();
  initSearch();
}

function startWebSocket() {
  connectWS(
    async (frame) => {
      await receiveMessage(frame);
      await loadConversations();
    },
    (frame) => {
      if (frame.event === 'user.online') store.onlineUsers.add(frame.user_id);
      if (frame.event === 'user.offline') store.onlineUsers.delete(frame.user_id);
      updatePresenceDot(frame.user_id, frame.event === 'user.online');
    }
  );
}

function bindAppEvents() {
  if (appEventsBound) return;
  appEventsBound = true;
  document.getElementById('logout-btn').addEventListener('click', async () => {
    if (!confirm('Log out?')) return;
    try { await api.logout(); } catch { /* ignore */ }
    if (store.ws) store.ws.close(1000);
    store.clear();
    resetMessageState()
    showView('auth');
    document.getElementById('input-username').value = '';
    document.getElementById('input-password').value = '';
  });

  bindChatInput((text) => {
    sendMessage(text);
  });

  bindLoadMore(async () => {
    if (store.activeConversation) {
      await loadMessages(store.activeConversation.user_id, true);
    }
  });

  bindBackButton(() => {
    document.getElementById('chat-panel').classList.add('hidden-mobile');
    document.getElementById('sidebar').classList.remove('hidden-mobile-sidebar');
    store.activeConversation = null;
  });
}



showView('auth');
initAuthUI(onLoginSuccess);
