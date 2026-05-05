import { registerAccount, loginAccount } from './auth.js';
import { showError, hideError } from '../../utils/ui.js';

let isRegisterMode = false;

export function initAuthUI(onSuccess) {
  const form = document.getElementById('auth-form');
  const toggleLink = document.getElementById('toggle-link');
  const submitBtn = document.getElementById('auth-submit');

  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    document.getElementById('field-display').classList.toggle('hidden', !isRegisterMode);
    document.getElementById('toggle-text').textContent = isRegisterMode
      ? 'Already have an account?'
      : "Don't have an account?";
    toggleLink.textContent = isRegisterMode ? 'Sign in' : 'Create one';
    submitBtn.textContent = isRegisterMode ? 'Create Account' : 'Sign In';
    hideError('auth-error');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('auth-error');

    const username = document.getElementById('input-username').value.trim();
    const password = document.getElementById('input-password').value;

    if (!username || !password) {
      showError('auth-error', 'Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      showError('auth-error', 'Password must be at least 8 characters.');
      return;
    }

    submitBtn.disabled = true;

    try {
      if (isRegisterMode) {
        await registerAccount(username, password, document.getElementById('input-display').value.trim());
      } else {
        await loginAccount(username, password);
      }
      onSuccess();
    } catch (err) {
      showError('auth-error', err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });
}
