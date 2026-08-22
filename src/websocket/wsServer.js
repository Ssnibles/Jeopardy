const WebSocket = require('ws');
const { WS_HEARTBEAT_INTERVAL_MS } = require('../config');
const roomManager = require('../game/RoomManager');
const { handleMessage } = require('./messageHandlers');

function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });
  let connIdCounter = 0;

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, WS_HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (ws) => {
    connIdCounter++;
    const connId = connIdCounter;
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    console.log(`[Conn#${connId}] New WebSocket connection opened`);

    const clientMeta = { role: null, roomCode: null, playerId: null };

    ws.on('message', (rawMessage) => {
      ws.isAlive = true;
      handleMessage(ws, rawMessage, clientMeta, connId);
    });

    ws.on('close', () => {
      const { roomCode, playerId, role } = clientMeta;
      if (!roomCode) return;
      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      if (role === 'PLAYER' && playerId) {
        room.handlePlayerDisconnect(playerId, ws);
      }
    });
  });

  return wss;
}

module.exports = { setupWebSocketServer };
