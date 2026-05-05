import { store } from '../../core/store.js';
import * as api from '../../services/api.js';
import { showView } from '../../utils/ui.js';
import { avatarEl } from '../../utils/avatar.js';
import { relativeTime } from '../../utils/format.js';
import { loadMessages, resetMessageState } from './chat.js';

export async function loadConversations() {
  const list = await api.getConversations();
  renderConversationList(list);
}

export function resetConversationView() {
  const conversationsList = document.getElementById('conversations-list');
  const chatEmpty = document.getElementById('chat-empty');
  const chatActive = document.getElementById('chat-active');
  const chatPanel = document.getElementById('chat-panel');
  const sidebar = document.getElementById('sidebar');
  const messagesList = document.getElementById('messages-list');
  const loadMoreWrap = document.getElementById('load-more-wrap');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const meName = document.getElementById('me-name');
  const meAvatar = document.getElementById('me-avatar');

  if (conversationsList) {
    conversationsList.innerHTML = '<p class="list-empty">No conversations yet.<br/>Search for a user above.</p>';
  }
  if (chatEmpty) chatEmpty.classList.remove('hidden');
  if (chatActive) chatActive.classList.add('hidden');
  if (chatPanel) chatPanel.classList.remove('hidden-mobile');
  if (sidebar) sidebar.classList.remove('hidden-mobile-sidebar');
  if (messagesList) messagesList.innerHTML = '';
  if (loadMoreWrap) loadMoreWrap.classList.add('hidden');
  if (searchInput) searchInput.value = '';
  if (searchResults) searchResults.classList.add('hidden');
  if (meName) meName.textContent = '';
  if (meAvatar) meAvatar.textContent = '';

  store.activeConversation = null;
}

export function syncLoggedInUserProfile(user) {
  const chip = document.getElementById('me-chip');
  const avatarHost = document.getElementById('me-avatar');
  const nameHost = document.getElementById('me-name');

  if (!chip || !avatarHost || !nameHost || !user) return;

  avatarHost.replaceWith(avatarEl(user.display_name || user.username, true));
  const newAvatar = chip.querySelector('.avatar');
  if (newAvatar) newAvatar.id = 'me-avatar';

  nameHost.textContent = user.display_name || user.username;
}

function renderConversationList(conversations) {
  const container = document.getElementById('conversations-list');
  if (!conversations.length) {
    container.innerHTML = '<p class="list-empty">No conversations yet.<br/>Search for a user above.</p>';
    return;
  }

  container.innerHTML = '';
  for (const conv of conversations) {
    container.appendChild(buildConvItem(conv));
  }
}

function buildConvItem(conv) {
  const item = document.createElement('div');
  item.className = 'conv-item';
  item.dataset.userId = conv.user_id;

  const avatar = avatarEl(conv.display_name || conv.username);
  const info = document.createElement('div');
  info.className = 'conv-info';

  const nameRow = document.createElement('div');
  nameRow.className = 'conv-name';
  nameRow.textContent = conv.display_name || conv.username;

  const timeRow = document.createElement('div');
  timeRow.className = 'conv-time';
  timeRow.textContent = relativeTime(conv.last_message_at);

  info.appendChild(nameRow);
  info.appendChild(timeRow);
  item.appendChild(avatar);
  item.appendChild(info);

  if (store.onlineUsers.has(conv.user_id)) {
    const dot = document.createElement('span');
    dot.className = 'presence-dot online';
    dot.id = `presence-${conv.user_id}`;
    item.appendChild(dot);
  }

  item.addEventListener('click', () => openConversation(conv));
  return item;
}

function updateChatStatus(userId) {
  const el = document.getElementById('chat-status');
  if (!el) return;
  const online = store.onlineUsers.has(userId);
  el.innerHTML = `<span class="presence-dot ${online ? 'online' : 'offline'}"></span>${online ? 'Online' : 'Offline'}`;
}

export function updatePresenceDot(userId, online) {
  const existingDot = document.getElementById(`presence-${userId}`);
  const convItem = document.querySelector(`.conv-item[data-user-id="${userId}"]`);
  if (convItem) {
    if (online && !existingDot) {
      const dot = document.createElement('span');
      dot.className = 'presence-dot online';
      dot.id = `presence-${userId}`;
      convItem.appendChild(dot);
    } else if (!online && existingDot) {
      existingDot.remove();
    }
  }
  if (store.activeConversation?.user_id === userId) {
    updateChatStatus(userId);
  }
}

export async function openConversation(conv) {
  store.activeConversation = conv;
  resetMessageState();

  document.querySelectorAll('.conv-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.userId === conv.user_id);
  });

  showView('app');
  document.getElementById('chat-empty').classList.add('hidden');
  document.getElementById('chat-active').classList.remove('hidden');
  document.getElementById('chat-panel').classList.remove('hidden-mobile');
  document.getElementById('sidebar').classList.add('hidden-mobile-sidebar');

  const headerAvatar = document.getElementById('chat-avatar');
  headerAvatar.replaceWith(avatarEl(conv.display_name || conv.username, true));
  const newAvatar = document.getElementById('chat-header').querySelector('.avatar');
  newAvatar.id = 'chat-avatar';

  document.getElementById('chat-name').textContent = conv.display_name || conv.username;
  updateChatStatus(conv.user_id);

  document.getElementById('messages-list').innerHTML = '';
  document.getElementById('load-more-wrap').classList.add('hidden');

  await loadMessages(conv.user_id, false);
  document.getElementById('msg-input').focus();
}



export function initSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-results');
  let debounce;

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (!q) {
      dropdown.classList.add('hidden');
      return;
    }

    debounce = setTimeout(async () => {
      const users = await api.searchUsers(q);
      if (!users.length) {
        dropdown.classList.add('hidden');
        return;
      }
      dropdown.innerHTML = '';
      for (const u of users) {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.appendChild(avatarEl(u.display_name || u.username));
        const label = document.createElement('span');
        label.textContent = u.display_name || u.username;
        item.appendChild(label);
        item.addEventListener('click', () => {
          dropdown.classList.add('hidden');
          input.value = '';
          openConversation({ user_id: u.id, display_name: u.display_name, username: u.username });
        });
        dropdown.appendChild(item);
      }
      dropdown.classList.remove('hidden');
    }, 300);
  });
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}
