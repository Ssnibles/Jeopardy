const WebSocket = require('ws');
const packService = require('../services/packService');
const tunnelService = require('../services/tunnelService');
const PlayerManager = require('./state/PlayerManager');
const BoardState = require('./state/BoardState');
const FinalJeopardyState = require('./state/FinalJeopardyState');
const BuzzerEngine = require('./engine/BuzzerEngine');

class Room {
  constructor(code, gamePack, gameMode = 'STANDARD', hostWs = null) {
    this.code = code;
    this.hostWs = hostWs;
    this.boardWs = null;
    this.gamePack = gamePack;
    this.gameMode = gameMode;
    this.currentRound = 'JEOPARDY';
    this.currentClue = null;
    this.isGameOver = false;
    this.winner = null;
    this.lastActivity = Date.now();

    this.playerManager = new PlayerManager(code);
    this.boardStateManager = new BoardState();
    this.finalJeopardyManager = new FinalJeopardyState(code);
    this.buzzerEngine = new BuzzerEngine(code);
  }

  // --- LEGACY GETTERS/SETTERS FOR COMPATIBILITY ---
  get players() {
    return this.playerManager.getPlayers();
  }

  set players(val) {
    this.playerManager.players = val;
  }

  get controllingPlayerId() {
    return this.playerManager.controllingPlayerId;
  }

  set controllingPlayerId(val) {
    this.playerManager.controllingPlayerId = val;
  }

  get disqualifiedPlayerIds() {
    return this.finalJeopardyManager.disqualifiedPlayerIds;
  }

  get finalJeopardy() {
    return this.finalJeopardyManager.getSerializedState();
  }

  get buzzerState() {
    return this.buzzerEngine.getBuzzerState();
  }

  get earlyBuzzPlayerIds() {
    return this.buzzerEngine.earlyBuzzPlayerIds;
  }

  set earlyBuzzPlayerIds(val) {
    this.buzzerEngine.earlyBuzzPlayerIds = val || {};
  }

  get boardState() {
    return this.boardStateManager.getBoardState(this.currentRound);
  }

  touch() {
    this.lastActivity = Date.now();
  }

  send(ws, type, data = {}) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, ...data }));
    }
  }

  broadcast(type, data = {}) {
    const payload = JSON.stringify({ type, ...data });

    if (this.hostWs && this.hostWs.readyState === WebSocket.OPEN) {
      this.hostWs.send(payload);
    }

    if (this.boardWs && this.boardWs.readyState === WebSocket.OPEN) {
      this.boardWs.send(payload);
    }

    this.players.forEach(p => {
      if (p.ws && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(payload);
      }
    });
  }

  broadcastState() {
    this.broadcast('ROOM_STATE', { state: this.getPublicState() });
  }

  getActiveCategories() {
    return packService.getActiveCategories(this.gamePack, this.currentRound);
  }

  getBoardState() {
    return this.boardStateManager.getBoardState(this.currentRound);
  }

  getLowestScoringPlayerId() {
    return this.playerManager.getLowestScoringPlayerId();
  }

  calculateStandings() {
    return this.playerManager.calculateStandings();
  }

  getPublicState() {
    const standings = this.playerManager.calculateStandings();
    const activeCats = this.getActiveCategories();
    const bState = this.getBoardState();

    let maxClueVal = 1000;
    activeCats.forEach(cat => {
      (cat.clues || []).forEach(c => {
        if (c.value && c.value > maxClueVal) maxClueVal = c.value;
      });
    });

    const eligiblePlayer = this.players.find(p => p.id === (this.currentClue && this.currentClue.eligiblePlayerId));
    const maxWager = eligiblePlayer ? Math.max(eligiblePlayer.score, maxClueVal) : maxClueVal;

    return {
      roomCode: this.code,
      publicUrl: tunnelService.getPublicUrl(),
      title: this.gamePack ? this.gamePack.title : 'Jeopardy Game',
      gameMode: this.gameMode || 'STANDARD',
      currentRound: this.currentRound || 'JEOPARDY',
      roundTitle: this.currentRound === 'DOUBLE_JEOPARDY' ? 'Double Jeopardy!' : (this.currentRound === 'FINAL_JEOPARDY' ? 'Final Jeopardy!' : 'Jeopardy! Round'),
      categories: activeCats.map(cat => ({
        name: cat.name,
        clues: (cat.clues || []).map(c => ({ value: c.value }))
      })),
      players: this.playerManager.getSerializedPlayers(this.finalJeopardyManager.disqualifiedPlayerIds),
      disqualifiedPlayerIds: this.finalJeopardyManager.disqualifiedPlayerIds,
      boardState: bState,
      currentClue: this.currentClue ? {
        catIndex: this.currentClue.catIndex,
        clueIndex: this.currentClue.clueIndex,
        categoryName: this.currentClue.categoryName,
        value: this.currentClue.wager || this.currentClue.value,
        clue: this.currentClue.clue,
        image: this.currentClue.image,
        dailyDouble: this.currentClue.dailyDouble,
        eligiblePlayerId: this.currentClue.eligiblePlayerId || null,
        eligiblePlayerName: this.currentClue.eligiblePlayerName || null,
        wager: this.currentClue.wager || this.currentClue.value,
        maxWager: maxWager,
        wagerSet: this.currentClue.wagerSet || false,
        lockedOutPlayerIds: this.currentClue.lockedOutPlayerIds || [],
        answerRevealed: this.currentClue.answerRevealed || false,
        answer: this.currentClue.answerRevealed ? this.currentClue.answer : undefined
      } : null,
      buzzerState: this.buzzerEngine.getBuzzerState(),
      controllingPlayerId: this.controllingPlayerId || (this.players.length > 0 ? this.players[0].id : null),
      finalJeopardy: this.finalJeopardyManager.getSerializedState(),
      isGameOver: this.isGameOver || false,
      winner: this.winner || (standings.length > 0 ? standings[0] : null),
      rankings: standings
    };
  }

  // --- PLAYER MANAGEMENT ---
  joinPlayer(name, color, avatar, msgPlayerId, ws, connId) {
    this.touch();
    const playerId = this.playerManager.joinPlayer(name, color, avatar, msgPlayerId, ws, connId);
    this.send(ws, 'PLAYER_JOIN_SUCCESS', { playerId, roomCode: this.code, state: this.getPublicState() });
    this.broadcastState();
    return playerId;
  }

  handlePlayerDisconnect(playerId, ws) {
    this.playerManager.handlePlayerDisconnect(playerId, ws, () => {
      this.broadcastState();
    });
  }

  kickPlayer(playerId) {
    this.touch();
    this.playerManager.kickPlayer(playerId);
    this.broadcastState();
  }

  adjustScore(playerId, delta) {
    this.touch();
    this.playerManager.adjustScore(playerId, delta);
    this.broadcastState();
  }

  setControllingPlayer(playerId) {
    this.touch();
    if (this.playerManager.setControllingPlayer(playerId)) {
      this.broadcastState();
    }
  }

  // --- CLUE & BOARD SELECTION ---
  selectClue(catIndex, clueIndex) {
    this.touch();
    const activeCats = this.getActiveCategories();
    const category = activeCats[catIndex];
    if (!category) return;
    const clueObj = category.clues ? category.clues[clueIndex] : null;
    if (!clueObj) return;

    if (this.boardStateManager.isClueRevealed(this.currentRound, catIndex, clueIndex)) return;

    if (!this.controllingPlayerId && this.players.length > 0) {
      this.controllingPlayerId = this.players[0].id;
    }

    let defaultEligibleId = this.controllingPlayerId || (this.players.length > 0 ? this.players[0].id : null);
    let defaultEligiblePlayer = this.playerManager.getPlayer(defaultEligibleId);
    let defaultDailyDoubleWager = clueObj.value * 2;
    if (defaultEligiblePlayer && defaultEligiblePlayer.score > defaultDailyDoubleWager) {
      defaultDailyDoubleWager = defaultEligiblePlayer.score;
    }

    this.currentClue = {
      catIndex,
      clueIndex,
      categoryName: category.name,
      value: clueObj.value,
      clue: clueObj.clue,
      answer: clueObj.answer,
      image: clueObj.image || '',
      dailyDouble: !!clueObj.dailyDouble,
      eligiblePlayerId: clueObj.dailyDouble ? (defaultEligiblePlayer ? defaultEligiblePlayer.id : null) : null,
      eligiblePlayerName: clueObj.dailyDouble ? (defaultEligiblePlayer ? defaultEligiblePlayer.name : null) : null,
      wager: clueObj.dailyDouble ? defaultDailyDoubleWager : clueObj.value,
      wagerSet: !clueObj.dailyDouble,
      lockedOutPlayerIds: [],
      answerRevealed: false
    };

    if (clueObj.dailyDouble) {
      this.buzzerEngine.setDailyDouble(defaultEligibleId);
    } else {
      this.buzzerEngine.lock();
    }

    this.broadcast('CLUE_SELECTED', {
      state: this.getPublicState(),
      clueObj: {
        ...this.currentClue,
        answer: undefined
      }
    });

    if (this.hostWs) {
      this.send(this.hostWs, 'HOST_CLUE_DETAILS', { clue: this.currentClue });
    }
  }

  setDailyDoublePlayer(playerId) {
    this.touch();
    if (!this.currentClue || !this.currentClue.dailyDouble) return;
    const targetPlayer = this.playerManager.getPlayer(playerId);
    if (targetPlayer) {
      this.currentClue.eligiblePlayerId = targetPlayer.id;
      this.currentClue.eligiblePlayerName = targetPlayer.name;
      this.controllingPlayerId = targetPlayer.id;
      this.buzzerEngine.setDailyDouble(targetPlayer.id);
      this.broadcastState();
      console.log(`[Room ${this.code}] Daily Double assigned to ${targetPlayer.name} (${targetPlayer.id})`);
    }
  }

  setWager(rawWager) {
    this.touch();
    if (!this.currentClue || !this.currentClue.dailyDouble) return;

    let maxClueVal = 1000;
    const activeCats = this.getActiveCategories();
    activeCats.forEach(cat => {
      (cat.clues || []).forEach(c => {
        if (c.value && c.value > maxClueVal) maxClueVal = c.value;
      });
    });

    const eligiblePlayer = this.playerManager.getPlayer(this.currentClue.eligiblePlayerId);
    const playerMaxWager = eligiblePlayer ? Math.max(eligiblePlayer.score, maxClueVal) : maxClueVal;

    const wagerVal = parseInt(rawWager, 10) || 5;
    const validatedWager = Math.max(5, Math.min(wagerVal, playerMaxWager));

    this.currentClue.wager = validatedWager;
    this.currentClue.wagerSet = true;
    this.buzzerEngine.setDailyDouble(this.currentClue.eligiblePlayerId);

    const statePayload = this.getPublicState();
    this.broadcast('WAGER_SET', { state: statePayload, wager: this.currentClue.wager });
    this.broadcastState();
  }

  // --- BUZZER LOGIC ---
  startBuzzerCountdown(durationInput, instant) {
    this.touch();
    if (!this.currentClue) return;

    this.buzzerEngine.startBuzzerCountdown(durationInput, instant, {
      onCountdownTick: (secondsLeft) => {
        this.broadcast('BUZZER_COUNTDOWN', { secondsLeft, state: this.getPublicState() });
      },
      onUnlocked: (unlockTime) => {
        this.broadcast('BUZZERS_UNLOCKED', { timestamp: unlockTime, state: this.getPublicState() });
      }
    });
  }

  pressBuzzer(playerId, ping, ws) {
    this.touch();
    if (!this.currentClue) return;

    this.buzzerEngine.pressBuzzer(playerId, ping, ws, {
      currentClue: this.currentClue,
      players: this.players
    }, {
      send: (w, type, data) => this.send(w, type, data),
      onUnlocked: (unlockTime) => {
        this.broadcast('BUZZERS_UNLOCKED', { timestamp: unlockTime, state: this.getPublicState() });
      },
      onStateChanged: () => {
        this.broadcastState();
      },
      onPlayerBuzzed: (winnerPayload) => {
        this.broadcast('PLAYER_BUZZED', winnerPayload);
      },
      onAnswerTimerTick: (secondsLeft, activePlayerId, activePlayerName) => {
        this.broadcast('ANSWER_TIMER_TICK', {
          secondsLeft,
          activePlayerId,
          activePlayerName
        });
      },
      onAnswerTimerExpired: (activePlayerId, activePlayerName) => {
        this.broadcast('ANSWER_TIMER_EXPIRED', {
          secondsLeft: 0,
          activePlayerId,
          activePlayerName,
          state: this.getPublicState()
        });
      }
    });
  }

  resetBuzzers() {
    this.touch();
    if (!this.currentClue) return;
    this.buzzerEngine.startBuzzerCountdown(0, true, {
      onUnlocked: (unlockTime) => {
        this.broadcast('BUZZERS_UNLOCKED', { timestamp: unlockTime, state: this.getPublicState() });
      }
    });
  }

  // --- ANSWER EVALUATION ---
  evaluateAnswer(isCorrect, targetPlayerId) {
    this.touch();
    if (!this.currentClue) return;

    this.buzzerEngine.clearAnswerTimer();
    this.buzzerEngine.clearCountdownTimer();

    const activePlayerId = this.buzzerEngine.buzzerState.activePlayerId || this.currentClue.eligiblePlayerId || targetPlayerId;
    const player = this.playerManager.getPlayer(activePlayerId);
    const clueVal = this.currentClue.wager || this.currentClue.value;

    if (!this.currentClue.lockedOutPlayerIds) this.currentClue.lockedOutPlayerIds = [];

    if (player) {
      if (isCorrect) {
        player.score += clueVal;
        this.controllingPlayerId = player.id;
        this.buzzerEngine.lock();
        this.boardStateManager.markClueRevealed(this.currentRound, this.currentClue.catIndex, this.currentClue.clueIndex);
        this.currentClue.answerRevealed = true;

        this.broadcast('ANSWER_EVALUATED', {
          isCorrect: true,
          playerId: activePlayerId,
          playerName: player.name,
          scoreChange: clueVal,
          answer: this.currentClue.answer,
          state: this.getPublicState()
        });

        this.checkGameOver();
      } else {
        player.score -= clueVal;

        if (!this.currentClue.lockedOutPlayerIds.includes(player.id)) {
          this.currentClue.lockedOutPlayerIds.push(player.id);
        }

        if (!this.controllingPlayerId) {
          this.controllingPlayerId = player.id;
        }

        this.buzzerEngine.buzzerState.activePlayerId = null;
        const remainingCandidates = (this.buzzerEngine.buzzerState.candidates || []).filter(c => !this.currentClue.lockedOutPlayerIds.includes(c.playerId));

        if (remainingCandidates.length > 0) {
          this.broadcast('ANSWER_EVALUATED', {
            isCorrect: false,
            playerId: activePlayerId,
            playerName: player.name,
            scoreChange: -clueVal,
            answer: this.currentClue.answerRevealed ? this.currentClue.answer : undefined,
            state: this.getPublicState()
          });

          this.buzzerEngine.resolveBuzzerWinner({
            currentClue: this.currentClue,
            players: this.players
          }, {
            onUnlocked: (unlockTime) => {
              this.broadcast('BUZZERS_UNLOCKED', { timestamp: unlockTime, state: this.getPublicState() });
            },
            onStateChanged: () => {
              this.broadcastState();
            },
            onPlayerBuzzed: (winnerPayload) => {
              this.broadcast('PLAYER_BUZZED', winnerPayload);
            },
            onAnswerTimerTick: (secondsLeft, aId, aName) => {
              this.broadcast('ANSWER_TIMER_TICK', { secondsLeft, activePlayerId: aId, activePlayerName: aName });
            },
            onAnswerTimerExpired: (aId, aName) => {
              this.broadcast('ANSWER_TIMER_EXPIRED', { secondsLeft: 0, activePlayerId: aId, activePlayerName: aName, state: this.getPublicState() });
            }
          });
        } else {
          const eligiblePlayers = this.players.filter(p => p.connected && !this.currentClue.lockedOutPlayerIds.includes(p.id));
          if (eligiblePlayers.length > 0 && !this.currentClue.dailyDouble) {
            this.buzzerEngine.startBuzzerCountdown(0, true, {
              onUnlocked: (unlockTime) => {
                this.broadcast('ANSWER_EVALUATED', {
                  isCorrect: false,
                  playerId: activePlayerId,
                  playerName: player.name,
                  scoreChange: -clueVal,
                  answer: this.currentClue.answerRevealed ? this.currentClue.answer : undefined,
                  state: this.getPublicState()
                });
                this.broadcast('BUZZERS_UNLOCKED', { timestamp: unlockTime, state: this.getPublicState() });
              }
            });
          } else {
            this.buzzerEngine.lock();
            this.currentClue.answerRevealed = true;
            this.broadcast('ANSWER_EVALUATED', {
              isCorrect: false,
              playerId: activePlayerId,
              playerName: player.name,
              scoreChange: -clueVal,
              answer: this.currentClue.answer,
              state: this.getPublicState()
            });
          }
        }
      }
    } else {
      this.currentClue.answerRevealed = true;
      this.broadcast('ANSWER_EVALUATED', {
        isCorrect: false,
        playerId: activePlayerId,
        playerName: '',
        scoreChange: -clueVal,
        answer: this.currentClue.answer,
        state: this.getPublicState()
      });
    }
  }

  revealAnswer() {
    this.touch();
    if (!this.currentClue) return;
    this.currentClue.answerRevealed = true;
    this.broadcast('ANSWER_REVEALED', { answer: this.currentClue.answer });
  }

  closeClue() {
    this.touch();
    if (!this.currentClue) return;

    this.buzzerEngine.clearAnswerTimer();
    this.boardStateManager.markClueRevealed(this.currentRound, this.currentClue.catIndex, this.currentClue.clueIndex);
    const closedClueAnswer = this.currentClue.answer;
    this.currentClue = null;
    this.buzzerEngine.reset();

    this.broadcast('CLUE_CLOSED', { state: this.getPublicState(), answer: closedClueAnswer });
    this.checkGameOver();
  }

  // --- ROUND TRANSITIONS & GAME OVER ---
  checkGameOver() {
    if (!this.gamePack) return false;
    const cats = this.getActiveCategories();
    let totalClues = 0;
    cats.forEach(c => {
      totalClues += (c.clues || []).length;
    });

    const revealedCount = this.boardStateManager.getRevealedCount(this.currentRound);

    if (totalClues > 0 && revealedCount >= totalClues) {
      if (this.currentRound === 'JEOPARDY') {
        if (this.gameMode === 'BLITZ') {
          this.startFinalJeopardy();
        } else {
          this.currentRound = 'DOUBLE_JEOPARDY';
          this.currentClue = null;
          this.buzzerEngine.reset();
          this.controllingPlayerId = this.getLowestScoringPlayerId();
          this.broadcast('ROUND_TRANSITION', {
            newRound: 'DOUBLE_JEOPARDY',
            state: this.getPublicState()
          });
          console.log(`[Room ${this.code}] Standard mode: Advanced to Double Jeopardy! Board control -> lowest scorer.`);
        }
        return false;
      } else if (this.currentRound === 'DOUBLE_JEOPARDY') {
        if (!this.finalJeopardyManager.state) {
          this.startFinalJeopardy();
        }
        return false;
      }
    }
    return false;
  }

  advanceRound() {
    this.touch();
    this.buzzerEngine.clearAnswerTimer();

    if (this.currentRound === 'JEOPARDY') {
      this.currentRound = 'DOUBLE_JEOPARDY';
      this.currentClue = null;
      this.buzzerEngine.reset();
      this.controllingPlayerId = this.getLowestScoringPlayerId();
      this.broadcast('ROUND_TRANSITION', { newRound: 'DOUBLE_JEOPARDY', state: this.getPublicState() });
      console.log(`[Room ${this.code}] Host manually advanced to Double Jeopardy! Control -> lowest scorer.`);
    } else if (this.currentRound === 'DOUBLE_JEOPARDY') {
      this.startFinalJeopardy();
    }
  }

  triggerGameOver() {
    this.touch();
    this.buzzerEngine.clearAnswerTimer();
    this.isGameOver = true;
    const standings = this.calculateStandings();
    this.winner = standings.length > 0 ? standings[0] : null;
    this.broadcast('GAME_OVER', {
      state: this.getPublicState(),
      rankings: standings
    });
  }

  resetGame() {
    this.touch();
    this.buzzerEngine.reset();
    this.currentRound = 'JEOPARDY';
    this.boardStateManager.resetBoard();
    this.currentClue = null;
    this.finalJeopardyManager.reset();
    this.isGameOver = false;
    this.winner = null;
    this.playerManager.resetScores();
    this.broadcastState();
  }

  changeGamePack(newPack, gameMode, keepPlayers = true) {
    this.touch();
    this.buzzerEngine.reset();
    if (newPack) this.gamePack = newPack;
    if (gameMode) this.gameMode = gameMode;

    this.currentRound = 'JEOPARDY';
    this.boardStateManager.resetBoard();
    this.currentClue = null;
    this.finalJeopardyManager.reset();
    this.isGameOver = false;
    this.winner = null;

    if (keepPlayers) {
      this.playerManager.players.forEach(p => p.score = 0);
    } else {
      this.playerManager.players = [];
    }
    this.controllingPlayerId = this.players.length > 0 ? this.players[0].id : null;

    this.broadcastState();
    console.log(`[Room ${this.code}] Host changed active game pack/mode (Mode: ${this.gameMode}, KeepPlayers: ${keepPlayers})`);
  }

  // --- FINAL JEOPARDY ---
  startFinalJeopardy() {
    this.touch();
    if (this.finalJeopardyManager.state === 'FINISHED') return;

    this.currentRound = 'FINAL_JEOPARDY';
    const disqualified = this.finalJeopardyManager.start(this.gamePack, this.players);

    this.broadcast('FINAL_JEOPARDY_STARTED', {
      state: this.getPublicState(),
      disqualifiedPlayerIds: disqualified
    });
  }

  submitFinalWager(playerId, rawWager, ws) {
    this.touch();
    if (this.finalJeopardyManager.isDisqualified(playerId)) {
      return this.send(ws, 'ERROR', { message: 'You are disqualified from Final Jeopardy due to a score of $0 or less.' });
    }

    if (this.finalJeopardyManager.submitWager(this.playerManager, playerId, rawWager)) {
      this.broadcastState();
    }
  }

  revealFinalClue() {
    this.touch();
    this.finalJeopardyManager.revealClue();
    this.broadcastState();
  }

  startFinalEvaluation() {
    this.touch();
    this.finalJeopardyManager.startEvaluation();
    this.broadcastState();
  }

  submitFinalResponse(playerId, responseText, ws) {
    this.touch();
    if (this.finalJeopardyManager.isDisqualified(playerId)) {
      return this.send(ws, 'ERROR', { message: 'You are disqualified from Final Jeopardy due to a score of $0 or less.' });
    }

    if (this.finalJeopardyManager.submitResponse(this.playerManager, playerId, responseText)) {
      this.broadcastState();
    }
  }

  evaluateFinalPlayer(targetPlayerId, isCorrect) {
    this.touch();
    this.finalJeopardyManager.evaluatePlayer(this.playerManager, targetPlayerId, isCorrect);
    this.broadcastState();
  }

  finishFinalJeopardy() {
    this.touch();
    this.finalJeopardyManager.finish();
    this.triggerGameOver();
  }

  destroy() {
    this.buzzerEngine.destroy();
    this.playerManager.destroy();
  }
}

module.exports = Room;
