const AVATAR_COLORS = [
  '#3b5bdb', '#e03131', '#2f9e44', '#1971c2', '#f08c00',
  '#6741d9', '#0c8599', '#c2255c', '#5c7cfa', '#20c997',
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
