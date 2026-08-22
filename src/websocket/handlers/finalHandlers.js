const roomManager = require('../../game/RoomManager');

function handleStartFinalJeopardy(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.startFinalJeopardy();
  }
}

function handleSubmitFinalWager(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'PLAYER') {
    room.submitFinalWager(clientMeta.playerId, msg.wager, ws);
  }
}

function handleRevealFinalClue(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.revealFinalClue();
  }
}

function handleStartFinalEvaluation(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.startFinalEvaluation();
  }
}

function handleSubmitFinalResponse(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'PLAYER') {
    room.submitFinalResponse(clientMeta.playerId, msg.response, ws);
  }
}

function handleEvaluateFinalPlayer(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.evaluateFinalPlayer(msg.targetPlayerId, msg.isCorrect);
  }
}

function handleFinishFinalJeopardy(ws, msg, clientMeta) {
  const room = roomManager.getRoom(clientMeta.roomCode);
  if (room && clientMeta.role === 'HOST') {
    room.finishFinalJeopardy();
  }
}

module.exports = {
  START_FINAL_JEOPARDY: handleStartFinalJeopardy,
  SUBMIT_FINAL_WAGER: handleSubmitFinalWager,
  REVEAL_FINAL_CLUE: handleRevealFinalClue,
  START_FINAL_EVALUATION: handleStartFinalEvaluation,
  SUBMIT_FINAL_RESPONSE: handleSubmitFinalResponse,
  EVALUATE_FINAL_PLAYER: handleEvaluateFinalPlayer,
  FINISH_FINAL_JEOPARDY: handleFinishFinalJeopardy
};
