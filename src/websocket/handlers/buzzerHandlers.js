const roomManager = require('../../game/RoomManager');

function handleStartBuzzerCountdown(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.startBuzzerCountdown(msg.duration, msg.instant);
  }
}

function handlePressBuzzer(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'PLAYER') {
    room.pressBuzzer(clientMeta.playerId, msg.ping, ws);
  }
}

function handleResetBuzzers(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.resetBuzzers();
  }
}

module.exports = {
  START_BUZZER_COUNTDOWN: handleStartBuzzerCountdown,
  UNLOCK_BUZZERS: handleStartBuzzerCountdown,
  PRESS_BUZZER: handlePressBuzzer,
  RESET_BUZZERS: handleResetBuzzers
};
