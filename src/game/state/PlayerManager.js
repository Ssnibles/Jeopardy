const { DISCONNECT_GRACE_MS } = require('../../config');

class PlayerManager {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.players = [];
    this.controllingPlayerId = null;
    this.disconnectTimers = {};
  }

  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  getPlayers() {
    return this.players;
  }

  findExistingPlayer(name, msgPlayerId, ws) {
    let player = msgPlayerId ? this.players.find(p => p.id === msgPlayerId) : null;
    if (!player) player = this.players.find(p => p.ws === ws);
    if (!player) player = this.players.find(p => p.name.toLowerCase() === (name || '').toLowerCase());
    return player;
  }

  joinPlayer(name, color, avatar, msgPlayerId, ws, connId) {
    const existingPlayer = this.findExistingPlayer(name, msgPlayerId, ws);
    let playerId;

    if (existingPlayer) {
      if (this.disconnectTimers[existingPlayer.id]) {
        clearTimeout(this.disconnectTimers[existingPlayer.id]);
        delete this.disconnectTimers[existingPlayer.id];
      }

      if (existingPlayer.ws && existingPlayer.ws !== ws) {
        try {
          existingPlayer.ws.removeAllListeners('close');
          existingPlayer.ws.close();
        } catch (e) {}
      }

      existingPlayer.ws = ws;
      existingPlayer.connected = true;
      existingPlayer.name = name;
      existingPlayer.color = color;
      if (avatar) existingPlayer.avatar = avatar;
      playerId = existingPlayer.id;
      console.log(`[Conn#${connId}] [Room ${this.roomCode}] Player RECONNECTED: ${name} (${playerId})`);
    } else {
      playerId = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const newPlayer = {
        id: playerId,
        name,
        score: 0,
        color,
        avatar: avatar || '',
        connected: true,
        ws
      };
      this.players.push(newPlayer);
      console.log(`[Conn#${connId}] [Room ${this.roomCode}] New player joined: ${name} (${playerId})`);
    }

    if (!this.controllingPlayerId && this.players.length > 0) {
      this.controllingPlayerId = this.players[0].id;
    }

    return playerId;
  }

  handlePlayerDisconnect(playerId, ws, onDisconnect) {
    const player = this.players.find(p => p.id === playerId);
    if (player && player.ws === ws) {
      if (this.disconnectTimers[playerId]) clearTimeout(this.disconnectTimers[playerId]);
      this.disconnectTimers[playerId] = setTimeout(() => {
        delete this.disconnectTimers[playerId];
        if (player.ws === ws) {
          player.connected = false;
          console.log(`[Room ${this.roomCode}] Player disconnected: ${player.name} (${playerId})`);
          if (typeof onDisconnect === 'function') onDisconnect();
        }
      }, DISCONNECT_GRACE_MS);
    }
  }

  kickPlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    if (this.controllingPlayerId === playerId) {
      this.controllingPlayerId = this.players.length > 0 ? this.players[0].id : null;
    }
  }

  adjustScore(playerId, delta) {
    const player = this.getPlayer(playerId);
    if (player) {
      player.score += (parseInt(delta, 10) || 0);
    }
  }

  setControllingPlayer(playerId) {
    const player = this.getPlayer(playerId);
    if (player) {
      this.controllingPlayerId = player.id;
      console.log(`[Room ${this.roomCode}] Host assigned board control to ${player.name}`);
      return true;
    }
    return false;
  }

  getLowestScoringPlayerId() {
    if (!this.players || this.players.length === 0) return null;
    const sorted = [...this.players].sort((a, b) => a.score - b.score);
    return sorted[0].id;
  }

  calculateStandings() {
    return [...this.players].sort((a, b) => b.score - a.score);
  }

  resetScores() {
    this.players.forEach(p => p.score = 0);
    if (this.players.length > 0) {
      this.controllingPlayerId = this.players[0].id;
    } else {
      this.controllingPlayerId = null;
    }
  }

  getSerializedPlayers(disqualifiedPlayerIds = []) {
    return this.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      color: p.color,
      avatar: p.avatar || '',
      connected: p.connected,
      isDisqualified: disqualifiedPlayerIds.includes(p.id)
    }));
  }

  destroy() {
    Object.keys(this.disconnectTimers).forEach(id => clearTimeout(this.disconnectTimers[id]));
    this.disconnectTimers = {};
  }
}

module.exports = PlayerManager;
