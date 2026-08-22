const WebSocket = require('ws');
const Room = require('./Room');
const packService = require('../services/packService');
const tunnelService = require('../services/tunnelService');
const { ROOM_CLEANUP_INTERVAL_MS, ROOM_INACTIVE_TTL_MS, ROOM_MAX_STALE_TTL_MS } = require('../config');

class RoomManager {
  constructor() {
    this.rooms = {}; // roomCode -> Room instance
    this.startCleanupTimer();

    tunnelService.onStateChange(() => {
      this.broadcastAllRoomsState();
    });
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  getRoom(code) {
    if (!code) return null;
    return this.rooms[code.toUpperCase()] || null;
  }

  createOrAttachRoom({ roomCode, pack1, pack2, gameMode = 'STANDARD', ws }) {
    let code = roomCode ? roomCode.toUpperCase() : this.generateRoomCode();
    if (!roomCode) {
      while (this.rooms[code]) {
        code = this.generateRoomCode();
      }
    }

    const finalPack = packService.resolvePack(pack1, pack2, gameMode);
    let room = this.rooms[code];

    if (!room) {
      room = new Room(code, finalPack, gameMode, ws);
      this.rooms[code] = room;
    } else {
      room.hostWs = ws;
      if (finalPack) room.gamePack = finalPack;
      if (gameMode) room.gameMode = gameMode;
      if (!room.gamePack) {
        room.gamePack = packService.loadDefaultPack();
      }
      room.touch();
    }

    return room;
  }

  broadcastAllRoomsState() {
    Object.keys(this.rooms).forEach(code => {
      this.rooms[code].broadcastState();
    });
  }

  startCleanupTimer() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      Object.keys(this.rooms).forEach(code => {
        const room = this.rooms[code];
        const hostActive = room.hostWs && room.hostWs.readyState === WebSocket.OPEN;
        const boardActive = room.boardWs && room.boardWs.readyState === WebSocket.OPEN;
        const playersActive = room.players.some(p => p.ws && p.ws.readyState === WebSocket.OPEN);

        if (!hostActive && !boardActive && !playersActive && (now - room.lastActivity > ROOM_INACTIVE_TTL_MS)) {
          console.log(`[Room Cleanup] Pruned inactive room ${code}`);
          room.destroy();
          delete this.rooms[code];
        } else if (now - room.lastActivity > ROOM_MAX_STALE_TTL_MS) {
          console.log(`[Room Cleanup] Pruned stale room ${code}`);
          room.destroy();
          delete this.rooms[code];
        }
      });
    }, ROOM_CLEANUP_INTERVAL_MS);
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = new RoomManager();
