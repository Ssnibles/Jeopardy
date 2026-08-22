const roomManager = require('../../game/RoomManager');
const packService = require('../../services/packService');

function send(ws, type, data = {}) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

function handleCreateRoom(ws, msg, clientMeta) {
  let pack1 = msg.gamePackRound1 || msg.gamePack;
  if (!pack1 && msg.packFileNameRound1) pack1 = packService.loadPackFile(msg.packFileNameRound1);
  if (!pack1 && msg.packFileName) pack1 = packService.loadPackFile(msg.packFileName);

  let pack2 = msg.gamePackRound2;
  if (!pack2 && msg.packFileNameRound2) pack2 = packService.loadPackFile(msg.packFileNameRound2);

  const room = roomManager.createOrAttachRoom({
    roomCode: msg.roomCode,
    pack1,
    pack2,
    gameMode: msg.gameMode || 'STANDARD',
    ws
  });

  clientMeta.role = 'HOST';
  clientMeta.roomCode = room.code;
  clientMeta.playerId = null;

  send(ws, 'ROOM_CREATED', { roomCode: room.code, state: room.getPublicState(), fullPack: room.gamePack });
  console.log(`[Room ${room.code}] Host attached/created (Mode: ${room.gameMode}).`);
}

function handleJoinBoard(ws, msg, clientMeta) {
  const roomCode = (msg.roomCode || '').toUpperCase();
  const room = roomManager.getRoom(roomCode);
  if (!room) {
    return send(ws, 'ERROR', { message: 'Room not found' });
  }
  room.boardWs = ws;
  clientMeta.role = 'BOARD';
  clientMeta.roomCode = roomCode;
  clientMeta.playerId = null;

  send(ws, 'BOARD_JOINED', { roomCode, state: room.getPublicState() });
  console.log(`[Room ${roomCode}] TV Board Display connected.`);
}

function handleJoinRoom(ws, msg, clientMeta, connId) {
  const roomCode = (msg.roomCode || '').toUpperCase();
  const name = (msg.name || 'Player').trim();
  const color = msg.color || '#3b82f6';
  const avatar = msg.avatar || '';
  const msgPlayerId = msg.playerId || (clientMeta && clientMeta.playerId) || '';
  const room = roomManager.getRoom(roomCode);

  if (!room) {
    console.log(`[Conn#${connId}] JOIN_ROOM failed: room ${roomCode} not found`);
    return send(ws, 'ERROR', { message: 'Room not found. Check room code.' });
  }

  console.log(`[Conn#${connId}] JOIN_ROOM for room=${roomCode} name=${name} playerId=${msgPlayerId || '(none)'}`);
  const playerId = room.joinPlayer(name, color, avatar, msgPlayerId, ws, connId);

  clientMeta.role = 'PLAYER';
  clientMeta.roomCode = roomCode;
  clientMeta.playerId = playerId;
}

function handleRequestState(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room) {
    send(ws, 'ROOM_STATE', { state: room.getPublicState() });
  }
}

function handleKickPlayer(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.kickPlayer(msg.playerId);
  }
}

module.exports = {
  CREATE_ROOM: handleCreateRoom,
  JOIN_BOARD: handleJoinBoard,
  JOIN_ROOM: handleJoinRoom,
  REQUEST_STATE: handleRequestState,
  KICK_PLAYER: handleKickPlayer
};
