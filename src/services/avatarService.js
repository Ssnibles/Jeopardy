const { AVATAR_TTL_MS, AVATAR_CLEANUP_INTERVAL_MS } = require('../config');

class AvatarService {
  constructor() {
    this.avatarStore = {}; // avatarId -> { buffer, mime, createdAt }
    this.startCleanupTimer();
  }

  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      Object.keys(this.avatarStore).forEach(id => {
        if (now - this.avatarStore[id].createdAt > AVATAR_TTL_MS) {
          delete this.avatarStore[id];
        }
      });
    }, AVATAR_CLEANUP_INTERVAL_MS);
  }

  saveAvatar(buffer, mime = 'image/png') {
    const id = 'av_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    this.avatarStore[id] = {
      buffer,
      mime: mime || 'image/png',
      createdAt: Date.now()
    };
    return id;
  }

  getAvatar(id) {
    return this.avatarStore[id] || null;
  }

  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

module.exports = new AvatarService();
