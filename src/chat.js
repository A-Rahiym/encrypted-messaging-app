// chat.js — conversations list + chat view logic

import { store } from './store.js';
import * as api from './api.js';
import * as crypto from './crypto.js';
import { avatarEl, formatTime, formatDate, relativeTime } from './ui.js';

let oldestMsgTimestamp = null;
let hasMoreMessages = false;
const seenMessageIds = new Set(); // replay-attack guard

export async function loadConversations() {
  const list = await api.getConversations();
  renderConversationList(list);
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

  item.addEventListener('click', () => openChat(conv));
  return item;
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

function updateChatStatus(userId) {
  const el = document.getElementById('chat-status');
  if (!el) return;
  const online = store.onlineUsers.has(userId);
  el.innerHTML = `<span class="presence-dot ${online ? 'online' : 'offline'}"></span>${online ? 'Online' : 'Offline'}`;
}



export async function openChat(conv) {
  store.activeConversation = conv;
  seenMessageIds.clear();
  oldestMsgTimestamp = null;


  document.querySelectorAll('.conv-item').forEach(el => {
    el.classList.toggle('active', el.dataset.userId === conv.user_id);
  });


  document.getElementById('chat-empty').classList.add('hidden');
  document.getElementById('chat-active').classList.remove('hidden');

  document.getElementById('chat-panel').classList.remove('hidden-mobile');
  document.getElementById('sidebar').classList.add('hidden-mobile-sidebar');


  const headerAvatar = document.getElementById('chat-avatar');
  headerAvatar.replaceWith(avatarEl(conv.display_name || conv.username, true));
  headerAvatar.id = 'chat-avatar'; // keep id after replace - set on new element
  const newAvatar = document.getElementById('chat-header').querySelector('.avatar');
  newAvatar.id = 'chat-avatar';

  document.getElementById('chat-name').textContent = conv.display_name || conv.username;
  updateChatStatus(conv.user_id);


  document.getElementById('messages-list').innerHTML = '';
  document.getElementById('load-more-wrap').classList.add('hidden');


  await loadMessages(conv.user_id, false);


  document.getElementById('msg-input').focus();
}


async function loadMessages(userId, prepend = false) {
  const messages = await api.getMessages(userId, 50, prepend ? oldestMsgTimestamp : null);
  if (!messages.length) return;


  const ordered = [...messages].reverse();

  if (!prepend) {

    oldestMsgTimestamp = messages[messages.length - 1].created_at;
  } else {
    oldestMsgTimestamp = messages[messages.length - 1].created_at;
  }

  hasMoreMessages = messages.length === 50;
  document.getElementById('load-more-wrap').classList.toggle('hidden', !hasMoreMessages);

  const container = document.getElementById('messages-list');
  const fragment = document.createDocumentFragment();
  let lastDate = null;

  for (const msg of ordered) {
    if (seenMessageIds.has(msg.id)) continue;
    seenMessageIds.add(msg.id);

    const msgDate = formatDate(msg.created_at);
    if (msgDate !== lastDate) {
      const sep = document.createElement('div');
      sep.className = 'date-sep';
      sep.textContent = msgDate;
      fragment.appendChild(sep);
      lastDate = msgDate;
    }

    const isSelf = msg.from_user_id === store.user.id;
    const row = await buildMessageRow(msg, isSelf);
    fragment.appendChild(row);
  }

  if (prepend) {
    container.insertBefore(fragment, container.firstChild);
  } else {
    container.appendChild(fragment);
    scrollToBottom();
  }
}

async function buildMessageRow(msg, isSelf) {
  const row = document.createElement('div');
  row.className = `msg-row ${isSelf ? 'sent' : 'recv'}`;
  row.dataset.msgId = msg.id;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  try {
    const plaintext = await crypto.decryptMessage(msg.payload, store.privateKey, isSelf);
    bubble.textContent = plaintext;

    const timeEl = document.createElement('div');
    timeEl.className = 'bubble-time';
    timeEl.textContent = formatTime(msg.created_at);
    bubble.appendChild(timeEl);
  } catch {
    bubble.classList.add('failed');
    bubble.textContent = '⚠ Message could not be decrypted';
  }

  row.appendChild(bubble);
  return row;
}



export async function receiveMessage(frame) {
  if (seenMessageIds.has(frame.id)) return;
  seenMessageIds.add(frame.id);

  const fromMe = frame.from_user_id === store.user.id;
  const partnerId = fromMe ? frame.to_user_id : frame.from_user_id;


  loadConversations();

  if (store.activeConversation?.user_id === partnerId) {
    const container = document.getElementById('messages-list');
    const atBottom = isAtBottom();
    const row = await buildMessageRow(frame, fromMe);
    container.appendChild(row);
    if (atBottom) scrollToBottom();
  }
}


export async function sendMessage(text) {
  if (!text.trim() || !store.activeConversation) return;

  const recipientId = store.activeConversation.user_id;
  const sendBtn = document.getElementById('send-btn');
  const input = document.getElementById('msg-input');

  sendBtn.disabled = true;
  input.disabled = true;

  try {

    const recipientPubKeyB64 = await api.getPublicKey(recipientId);
    const recipientPublicKey = await crypto.importPublicKey(recipientPubKeyB64);

    const payload = await crypto.encryptMessage(text.trim(), recipientPublicKey, store.ownPublicKey);
    const tempMsg = {
      id: 'temp-' + Date.now(),
      payload,
      from_user_id: store.user.id,
      to_user_id: recipientId,
      created_at: new Date().toISOString()
    };

    const container = document.getElementById('messages-list');
    const row = await buildMessageRow(tempMsg, true);
    container.appendChild(row);
    scrollToBottom();

    const { sendWS, sendMessageHTTP } = await import('./api.js');
    const sent = sendWS(recipientId, payload);
    if (!sent) await sendMessageHTTP(recipientId, payload);

    input.value = '';
    input.style.height = 'auto';
  } catch (err) {
    alert('Failed to send message: ' + err.message);
  } finally {
    sendBtn.disabled = false;
    input.disabled = false;
    input.focus();
  }
}


export function initSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-results');
  let debounce;

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (!q) { dropdown.classList.add('hidden'); return; }

    debounce = setTimeout(async () => {
      const users = await api.searchUsers(q);
      if (!users.length) { dropdown.classList.add('hidden'); return; }

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
          openChat({ user_id: u.id, display_name: u.display_name, username: u.username });
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



function scrollToBottom() {
  const c = document.getElementById('messages-container');
  c.scrollTop = c.scrollHeight;
}

function isAtBottom() {
  const c = document.getElementById('messages-container');
  return c.scrollHeight - c.scrollTop - c.clientHeight < 60;
}



export function initLoadMore() {
  document.getElementById('load-more-btn').addEventListener('click', () => {
    if (store.activeConversation) {
      loadMessages(store.activeConversation.user_id, true);
    }
  });
}


export function initBackButton() {
  document.getElementById('back-btn').addEventListener('click', () => {
    document.getElementById('chat-panel').classList.add('hidden-mobile');
    document.getElementById('sidebar').classList.remove('hidden-mobile-sidebar');
    store.activeConversation = null;
  });
}
