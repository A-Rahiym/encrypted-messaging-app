// auth.js — register / login flow

import { store } from './store.js';
import * as api from './api.js';
import * as crypto from './crypto.js';
import { showLoading, hideLoading, showError, hideError } from './ui.js';

let isRegisterMode = false;
console.log('Auth module loaded');

export function initAuth(onSuccess) {
  console.log('Initializing auth');
  const form = document.getElementById('auth-form');
  const toggleLink = document.getElementById('toggle-link');
  const submitBtn = document.getElementById('auth-submit');


  toggleLink.addEventListener('click', (e) => {
    console.log('Toggling auth mode');
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    document.getElementById('field-display').classList.toggle('hidden', !isRegisterMode);
    document.getElementById('toggle-text').textContent = isRegisterMode
      ? 'Already have an account?' : "Don't have an account?";
    toggleLink.textContent = isRegisterMode ? 'Sign in' : 'Create one';
    submitBtn.textContent = isRegisterMode ? 'Create Account' : 'Sign In';
    hideError('auth-error');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError('auth-error');

    const username = document.getElementById('input-username').value.trim();
    const password = document.getElementById('input-password').value;
    console.log('Form submitted with username:', username);
    console.log('Form submitted with password:', password);
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
        await handleRegister(username, password, onSuccess);
      } else {
        await handleLogin(username, password, onSuccess);
      }
    } catch (err) {
      showError('auth-error', err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

async function handleRegister(username, password, onSuccess) {
  const displayName = document.getElementById('input-display').value.trim() || username;
  console.log('Handling registration for', username);
  showLoading('Generating your encryption keys…');
  const keypair = await crypto.generateKeyPair();
  const salt = crypto.generateSalt();
  const wrappingKey = await crypto.deriveWrappingKey(password, salt);
  console.log('Key pair generated, registering with server…');
  const wrappedPrivateKey = await crypto.wrapPrivateKey(keypair.privateKey, wrappingKey);
  const publicKeyB64 = await crypto.exportPublicKey(keypair.publicKey);

  let data;
  try {
    data = await api.register({
      username,
      display_name: displayName,
      password,
      public_key: publicKeyB64,
      wrapped_private_key: wrappedPrivateKey,
      pbkdf2_salt: salt,
    });

    console.log('Registration successful, Setting up your secure session…', data);
  } finally {
    hideLoading();
  }

  store.accessToken = data.access_token;
  store.refreshToken = data.refresh_token;
  store.user = data.user;
  store.privateKey = keypair.privateKey;
  store.ownPublicKey = keypair.publicKey;

  onSuccess();
}

async function handleLogin(username, password, onSuccess) {
  console.log('Handling login for', username);
  showLoading('Restoring your secure session…');

  let data;
  try {
    data = await api.login(username, password);
  } finally {
    hideLoading();
  }

  store.accessToken = data.access_token;
  store.refreshToken = data.refresh_token;
  store.user = data.user;

  showLoading('Restoring your secure session…');
  try {
    const wrappingKey = await crypto.deriveWrappingKey(password, data.user.pbkdf2_salt);
    store.privateKey = await crypto.unwrapPrivateKey(data.user.wrapped_private_key, wrappingKey);
    store.ownPublicKey = await crypto.importPublicKey(data.user.public_key);
  } finally {
    hideLoading();
  }

  onSuccess();
}
