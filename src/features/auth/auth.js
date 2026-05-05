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
  store.tokenExpiresAt = Date.now() + ((data.expires_in || 900) * 1000);

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
  store.tokenExpiresAt = Date.now() + ((data.expires_in || 900) * 1000);

  showLoading('Restoring your secure session…');
  try {
    const profile = await api.authMe().catch(() => data.user);
    store.user = profile;
    const wrappingKey = await crypto.deriveWrappingKey(password, profile.pbkdf2_salt);
    const legacyWrappingKey = await crypto.deriveLegacyWrappingKey(password, profile.pbkdf2_salt);
    store.privateKey = await crypto.unwrapPrivateKey(profile.wrapped_private_key, wrappingKey, legacyWrappingKey);
    store.ownPublicKey = await crypto.importPublicKey(profile.public_key);
  } finally {
    hideLoading();
  }
  return data;
}
