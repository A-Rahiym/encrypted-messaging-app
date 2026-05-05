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
