import { store } from '../../core/store.js';
import * as api from '../../services/api.js';
import * as crypto from '../../core/crypto.js';
import { showLoading, hideLoading } from '../../utils/ui.js';

export async function registerAccount(username, password, displayName) {
  const resolvedDisplayName = displayName || username;
  showLoading('Generating your encryption keys…');

  const keypair = await crypto.generateKeyPair();
  const salt = crypto.generateSalt();
  const wrappingKey = await crypto.deriveWrappingKey(password, salt);
  const wrappedPrivateKey = await crypto.wrapPrivateKey(keypair.privateKey, wrappingKey);
  const publicKeyB64 = await crypto.exportPublicKey(keypair.publicKey);

  let data;
  try {
    data = await api.register({
      username,
      display_name: resolvedDisplayName,
      password,
      public_key: publicKeyB64,
      wrapped_private_key: wrappedPrivateKey,
      pbkdf2_salt: salt,
    });
  } finally {
    hideLoading();
  }

  store.accessToken = data.access_token;
  store.refreshToken = data.refresh_token;
  store.user = data.user;
  store.privateKey = keypair.privateKey;
  store.ownPublicKey = keypair.publicKey;

  return data;
}

export async function loginAccount(username, password) {
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

  return data;
}
