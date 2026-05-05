import { store } from '../../core/store.js';
import * as api from '../../services/api.js';
import * as crypto from '../../core/crypto.js';
import { sendWS } from '../../services/websocket.js';
import { buildMessageRow, isAtBottom, scrollToBottom } from './chat.ui.js';

let oldestMsgTimestamp = null;
const seenMessageIds = new Set();

export function resetMessageState() {
  seenMessageIds.clear();
  oldestMsgTimestamp = null;
}

export async function loadMessages(userId, prepend = false) {
  const messages = await api.getMessages(userId, 50, prepend ? oldestMsgTimestamp : null);
  if (!messages.length) return;

  const ordered = [...messages].reverse();
  oldestMsgTimestamp = messages[messages.length - 1].created_at;

  const container = document.getElementById('messages-list');
  const fragment = document.createDocumentFragment();
  let lastDate = null;

  for (const msg of ordered) {
    if (seenMessageIds.has(msg.id)) continue;
    seenMessageIds.add(msg.id);

    const msgDate = new Date(msg.created_at).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
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

  document.getElementById('load-more-wrap').classList.toggle('hidden', messages.length !== 50);

  if (prepend) {
    container.insertBefore(fragment, container.firstChild);
  } else {
    container.appendChild(fragment);
    scrollToBottom();
  }
}

export async function receiveMessage(frame) {
  if (seenMessageIds.has(frame.id)) return;
  seenMessageIds.add(frame.id);

  const fromMe = frame.from_user_id === store.user.id;
  const partnerId = fromMe ? frame.to_user_id : frame.from_user_id;

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
      created_at: new Date().toISOString(),
    };

    const container = document.getElementById('messages-list');
    const row = await buildMessageRow(tempMsg, true);
    container.appendChild(row);
    scrollToBottom();

    const sent = sendWS(recipientId, payload);
    if (!sent) await api.sendMessageHTTP(recipientId, payload);

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
