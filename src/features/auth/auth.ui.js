import { registerAccount, loginAccount } from './auth.js';
import { showError, hideError } from '../../utils/ui.js';

let isRegisterMode = false;

function isUniqueRegisterPassword(username, displayName, password) {
  const normalizedPassword = password.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedDisplayName = displayName.trim().toLowerCase();

  return (
    normalizedPassword.length >= 8 &&
    normalizedPassword !== normalizedUsername &&
    normalizedPassword !== normalizedDisplayName
  );
}

export function initAuthUI(onSuccess) {
  const form = document.getElementById('auth-form');
  const toggleLink = document.getElementById('toggle-link');
  const submitBtn = document.getElementById('auth-submit');
  const authSub = document.getElementById('auth-sub');
  const authKicker = document.getElementById('auth-kicker');

  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    document.getElementById('field-display').classList.toggle('hidden', !isRegisterMode);
    document.getElementById('field-display').classList.toggle('hidden', !isRegisterMode);

    const authCopy = isRegisterMode
      ? {
        sub: 'Create your account to start chatting.',
        kicker: 'Join...',
      }
      : {
        sub: 'Sign in to continue.',
        kicker: 'Welcome back',
      };

    if (authSub) authSub.textContent = authCopy.sub;
    if (authKicker) authKicker.textContent = authCopy.kicker;

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
    const displayName = document.getElementById('input-display').value.trim();

    if (!username || !password) {
      showError('auth-error', 'Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      showError('auth-error', 'Password must be at least 8 characters.');
      return;
    }

    if (isRegisterMode && !isUniqueRegisterPassword(username, displayName || username, password)) {
      showError('auth-error', 'Choose a password that does not match your username or display name.');
      return;
    }

    submitBtn.disabled = true;

    try {
      if (isRegisterMode) {
        await registerAccount(username, password, displayName);
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