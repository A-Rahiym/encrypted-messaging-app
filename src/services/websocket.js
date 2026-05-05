import { WS_RECONNECT_DELAY_MS, WS_URL } from '../core/constants.js';
import { store } from '../core/store.js';

export function connectWS(onMessage, onPresence) {
  if (store.ws && store.ws.readyState < 2) store.ws.close();

  const ws = new WebSocket(`${WS_URL}/ws?token=${store.accessToken}`);
  store.ws = ws;

  ws.onmessage = (e) => {
    try {
      const frame = JSON.parse(e.data);
      if (frame.event === 'message.receive') onMessage(frame);
      if (frame.event === 'user.online' || frame.event === 'user.offline') onPresence(frame);
    } catch {
      /* ignore malformed */
    }
  };

  ws.onclose = (e) => {
    if (e.code !== 1000) {
      setTimeout(() => connectWS(onMessage, onPresence), WS_RECONNECT_DELAY_MS);
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
