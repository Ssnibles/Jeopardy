const roomManager = require('../../game/RoomManager');
const packService = require('../../services/packService');

function send(ws, type, data = {}) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

function handleSelectClue(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.selectClue(msg.catIndex, msg.clueIndex);
  }
}

function handleSetDailyDoublePlayer(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.setDailyDoublePlayer(msg.playerId);
  }
}

function handleSetControllingPlayer(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.setControllingPlayer(msg.playerId);
  }
}

function handleSetWager(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room) {
    room.setWager(msg.wager);
  }
}

function handleEvaluateAnswer(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.evaluateAnswer(msg.isCorrect, msg.playerId);
  }
}

function handleRevealAnswer(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.revealAnswer();
  }
}

function handleCloseClue(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.closeClue();
  }
}

function handleTriggerGameOver(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.triggerGameOver();
  }
}

function handleResetGame(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.resetGame();
  }
}

function handleChangeGamePack(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (!room || clientMeta.role !== 'HOST') return;

  let pack1 = msg.gamePackRound1 || msg.gamePack;
  if (!pack1 && msg.packFileNameRound1) pack1 = packService.loadPackFile(msg.packFileNameRound1);
  if (!pack1 && msg.packFileName) pack1 = packService.loadPackFile(msg.packFileName);

  let pack2 = msg.gamePackRound2;
  if (!pack2 && msg.packFileNameRound2) pack2 = packService.loadPackFile(msg.packFileNameRound2);

  const newPack = packService.resolvePack(pack1, pack2, msg.gameMode || room.gameMode);
  if (newPack || msg.gameMode) {
    room.changeGamePack(newPack, msg.gameMode, msg.keepPlayers !== false);
  } else {
    send(ws, 'ERROR', { message: 'Failed to load selected game pack.' });
  }
}

function handleAdjustScore(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.adjustScore(msg.playerId, msg.delta);
  }
}

function handleAdvanceRound(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.advanceRound();
  }
}

module.exports = {
  SELECT_CLUE: handleSelectClue,
  SET_DAILY_DOUBLE_PLAYER: handleSetDailyDoublePlayer,
  SET_CONTROLLING_PLAYER: handleSetControllingPlayer,
  SET_WAGER: handleSetWager,
  EVALUATE_ANSWER: handleEvaluateAnswer,
  REVEAL_ANSWER: handleRevealAnswer,
  CLOSE_CLUE: handleCloseClue,
  TRIGGER_GAME_OVER: handleTriggerGameOver,
  RESET_GAME: handleResetGame,
  CHANGE_GAME_PACK: handleChangeGamePack,
  ADJUST_SCORE: handleAdjustScore,
  ADVANCE_ROUND: handleAdvanceRound
};
