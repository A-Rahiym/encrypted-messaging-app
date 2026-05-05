export const store = {
  accessToken: null,
  refreshToken: null,
  user: null,
  privateKey: null,
  ownPublicKey: null,
  publicKeyCache: {},
  onlineUsers: new Set(),
  ws: null,
  activeConversation: null,
  tokenExpiresAt: null,

  clear() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    this.privateKey = null;
    this.ownPublicKey = null;
    this.publicKeyCache = {};
    this.onlineUsers = new Set();
    this.ws = null;
    this.activeConversation = null;
    this.tokenExpiresAt = null;
  },
};
