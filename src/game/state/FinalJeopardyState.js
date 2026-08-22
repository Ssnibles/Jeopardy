class FinalJeopardyState {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.state = null; // null | 'WAGER' | 'CLUE' | 'EVALUATION' | 'FINISHED'
    this.category = '';
    this.clue = '';
    this.answer = '';
    this.disqualifiedPlayerIds = [];
    this.wagers = {};
    this.responses = {};
    this.evaluated = {};
  }

  start(gamePack, players) {
    if (this.state === 'FINISHED') return this.disqualifiedPlayerIds;

    this.state = 'WAGER';
    const packFJ = (gamePack && gamePack.finalJeopardy) ? gamePack.finalJeopardy : null;
    this.category = packFJ ? packFJ.category : 'World History & Explorers';
    this.clue = packFJ ? packFJ.clue : 'This Portuguese explorer was the first European to reach India by sea, opening the Cape Route in 1498.';
    this.answer = packFJ ? packFJ.answer : 'Vasco da Gama';

    this.disqualifiedPlayerIds = players.filter(p => p.score <= 0).map(p => p.id);
    this.wagers = {};
    this.responses = {};
    this.evaluated = {};

    console.log(`[Room ${this.roomCode}] Final Jeopardy Round started! Category: ${this.category}. Disqualified: ${this.disqualifiedPlayerIds.length} players.`);
    return this.disqualifiedPlayerIds;
  }

  isDisqualified(playerId) {
    return this.disqualifiedPlayerIds.includes(playerId);
  }

  submitWager(playerManager, playerId, rawWager) {
    if (!this.state || this.isDisqualified(playerId)) return false;

    const player = playerManager.getPlayer(playerId);
    if (!player) return false;

    const maxW = Math.max(0, player.score);
    const parsedWager = parseInt(rawWager, 10);
    const validatedWager = isNaN(parsedWager) ? 0 : Math.max(0, Math.min(parsedWager, maxW));

    this.wagers[playerId] = validatedWager;
    console.log(`[Room ${this.roomCode}] Final Jeopardy Wager set by ${player.name}: $${validatedWager}`);
    return true;
  }

  revealClue() {
    if (!this.state) return;
    this.state = 'CLUE';
    console.log(`[Room ${this.roomCode}] Final Jeopardy Clue revealed!`);
  }

  startEvaluation() {
    if (!this.state) return;
    this.state = 'EVALUATION';
    console.log(`[Room ${this.roomCode}] Final Jeopardy Evaluation phase started!`);
  }

  submitResponse(playerManager, playerId, responseText) {
    if (!this.state || this.isDisqualified(playerId)) return false;

    const player = playerManager.getPlayer(playerId);
    if (!player) return false;

    this.responses[playerId] = (responseText || '').trim();
    console.log(`[Room ${this.roomCode}] Final Jeopardy Response submitted by ${player.name}`);
    return true;
  }

  evaluatePlayer(playerManager, targetPlayerId, isCorrect) {
    if (!this.state) return;

    const player = playerManager.getPlayer(targetPlayerId);
    if (!player) return;

    const wager = this.wagers[targetPlayerId] || 0;

    if (this.evaluated[targetPlayerId]) {
      const prevEval = this.evaluated[targetPlayerId];
      if (prevEval.isCorrect) {
        player.score -= prevEval.wager;
      } else {
        player.score += prevEval.wager;
      }
    }

    if (isCorrect) {
      player.score += wager;
    } else {
      player.score -= wager;
    }

    this.evaluated[targetPlayerId] = {
      isCorrect: !!isCorrect,
      wager: wager,
      response: this.responses[targetPlayerId] || '(No answer)'
    };
  }

  finish() {
    if (this.state) {
      this.state = 'FINISHED';
    }
  }

  reset() {
    this.state = null;
    this.category = '';
    this.clue = '';
    this.answer = '';
    this.disqualifiedPlayerIds = [];
    this.wagers = {};
    this.responses = {};
    this.evaluated = {};
  }

  getSerializedState() {
    if (!this.state) return null;

    return {
      state: this.state,
      category: this.category,
      clue: (this.state === 'CLUE' || this.state === 'EVALUATION' || this.state === 'FINISHED') ? this.clue : undefined,
      answer: this.answer || '',
      wagers: this.wagers,
      responses: this.responses,
      evaluated: this.evaluated
    };
  }
}

module.exports = FinalJeopardyState;
