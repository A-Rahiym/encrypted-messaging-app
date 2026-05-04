

export function showView(name) {
  document.getElementById('view-auth').classList.add('hidden');
  document.getElementById('view-app').classList.add('hidden');
  if (name !== 'loading') {
    document.getElementById(`view-${name}`).classList.remove('hidden');
  }
}

export function showLoading(msg = 'Loading…') {
  document.getElementById('loading-text').textContent = msg;
  document.getElementById('view-loading').classList.remove('hidden');
}

export function hideLoading() {
  document.getElementById('view-loading').classList.add('hidden');
}

export function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

export function hideError(id) {
  document.getElementById(id).classList.add('hidden');
}

const AVATAR_COLORS = [
  '#3b5bdb','#e03131','#2f9e44','#1971c2','#f08c00',
  '#6741d9','#0c8599','#c2255c','#5c7cfa','#20c997',
];

export function avatarColor(str) {
  let hash = 0;
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function avatarEl(name, large = false) {
  const div = document.createElement('div');
  div.className = 'avatar' + (large ? ' lg' : '');
  div.style.background = avatarColor(name);
  div.textContent = (name || '?').slice(0, 1).toUpperCase();
  return div;
}

export function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function relativeTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return formatTime(isoStr);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
