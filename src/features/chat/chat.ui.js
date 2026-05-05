import { store } from '../../core/store.js';
import * as crypto from '../../core/crypto.js';
import { formatTime } from '../../utils/format.js';
import { showToast } from '../../utils/ui.js';

export async function buildMessageRow(msg, isSelf) {
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
    bubble.textContent = 'Message could not be decrypted';
    showToast('Some messages could not be decrypted.');
  }

  row.appendChild(bubble);
  return row;
}

export function scrollToBottom() {
  const c = document.getElementById('messages-container');
  c.scrollTop = c.scrollHeight;
}

export function isAtBottom() {
  const c = document.getElementById('messages-container');
  return c.scrollHeight - c.scrollTop - c.clientHeight < 60;
}

export function bindChatInput(onSend) {
  const input = document.getElementById('msg-input');
  const sendBtn = document.getElementById('send-btn');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(input.value);
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });

  sendBtn.addEventListener('click', () => {
    onSend(input.value);
  });
}

export function bindLoadMore(onLoadMore) {
  document.getElementById('load-more-btn').addEventListener('click', onLoadMore);
}

export function bindBackButton(onBack) {
  document.getElementById('back-btn').addEventListener('click', onBack);
}
