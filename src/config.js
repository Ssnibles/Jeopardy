const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

module.exports = {
  PORT: process.env.PORT || 3000,
  ROOT_DIR,
  PUBLIC_DIR: path.join(ROOT_DIR, 'public'),
  DEFAULT_GAME_PATH: path.join(ROOT_DIR, 'default_game.json'),
  PACKS_DIR: path.join(ROOT_DIR, 'packs'),
  
  DISCONNECT_GRACE_MS: 5000,
  EARLY_BUZZ_PENALTY_MS: 250,
  BUZZER_COLLECTION_WINDOW_MS: 250,
  ANSWER_TIMER_DURATION_SEC: 7,
  
  AVATAR_TTL_MS: 24 * 60 * 60 * 1000,
  AVATAR_CLEANUP_INTERVAL_MS: 60 * 60 * 1000,
  
  ROOM_CLEANUP_INTERVAL_MS: 15 * 60 * 1000,
  ROOM_INACTIVE_TTL_MS: 30 * 60 * 1000,
  ROOM_MAX_STALE_TTL_MS: 2 * 60 * 60 * 1000,
  
  WS_HEARTBEAT_INTERVAL_MS: 30000,
};
