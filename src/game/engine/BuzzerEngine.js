const { EARLY_BUZZ_PENALTY_MS, BUZZER_COLLECTION_WINDOW_MS, ANSWER_TIMER_DURATION_SEC } = require('../../config');

class BuzzerEngine {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [], candidates: [] };
    this.earlyBuzzPlayerIds = {};
    
    this.countdownTimer = null;
    this.collectionTimer = null;
    this.answerTimerInterval = null;
    this.answerSecondsLeft = 0;
  }

  getBuzzerState() {
    return this.buzzerState;
  }

  clearCountdownTimer() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  clearCollectionTimer() {
    if (this.collectionTimer) {
      clearTimeout(this.collectionTimer);
      this.collectionTimer = null;
    }
  }

  clearAnswerTimer() {
    if (this.answerTimerInterval) {
      clearInterval(this.answerTimerInterval);
      this.answerTimerInterval = null;
    }
  }

  resetEarlyBuzzPenalties() {
    this.earlyBuzzPlayerIds = {};
  }

  lock() {
    this.clearAnswerTimer();
    this.clearCountdownTimer();
    this.clearCollectionTimer();
    this.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [], candidates: [] };
  }

  setDailyDouble(eligiblePlayerId) {
    this.clearAnswerTimer();
    this.clearCountdownTimer();
    this.clearCollectionTimer();
    this.earlyBuzzPlayerIds = {};
    this.buzzerState = { state: 'DAILY_DOUBLE', activePlayerId: eligiblePlayerId, buzzedQueue: [], candidates: [] };
  }

  startBuzzerCountdown(durationInput, instant, callbacks = {}) {
    this.clearCountdownTimer();
    this.clearAnswerTimer();
    this.clearCollectionTimer();
    this.earlyBuzzPlayerIds = {};

    const durationSeconds = instant ? 0 : (durationInput !== undefined ? parseInt(durationInput, 10) : 3);

    if (durationSeconds <= 0) {
      this.buzzerState = { state: 'UNLOCKED', activePlayerId: null, buzzedQueue: [], candidates: [], unlockTime: Date.now() };
      if (callbacks.onUnlocked) callbacks.onUnlocked(this.buzzerState.unlockTime);
    } else {
      this.buzzerState = { state: 'COUNTDOWN', countdownSec: durationSeconds, activePlayerId: null, buzzedQueue: [], candidates: [] };
      if (callbacks.onCountdownTick) callbacks.onCountdownTick(durationSeconds);

      let currentSec = durationSeconds;
      this.countdownTimer = setInterval(() => {
        currentSec--;
        if (currentSec > 0) {
          this.buzzerState.countdownSec = currentSec;
          if (callbacks.onCountdownTick) callbacks.onCountdownTick(currentSec);
        } else {
          this.clearCountdownTimer();
          this.buzzerState = { state: 'UNLOCKED', activePlayerId: null, buzzedQueue: [], candidates: [], unlockTime: Date.now() };
          if (callbacks.onUnlocked) callbacks.onUnlocked(this.buzzerState.unlockTime);
        }
      }, 1000);
    }
  }

  pressBuzzer(playerId, ping, ws, roomContext, callbacks = {}) {
    const { currentClue, players } = roomContext;
    if (!currentClue) return;

    if (!this.earlyBuzzPlayerIds) this.earlyBuzzPlayerIds = {};

    if (this.buzzerState.state === 'COUNTDOWN' || this.buzzerState.state === 'LOCKED') {
      this.earlyBuzzPlayerIds[playerId] = Date.now();
      if (callbacks.send) {
        callbacks.send(ws, 'EARLY_BUZZ_PENALTY', { message: 'Early Buzz! 250ms penalty applied when buzzers unlock.' });
      }
      console.log(`[Room ${this.roomCode}] Early buzz penalty registered for player ${playerId}`);
      return;
    }

    if (this.buzzerState.state !== 'UNLOCKED' && this.buzzerState.state !== 'COLLECTING') return;

    if (this.earlyBuzzPlayerIds[playerId]) {
      const unlockTime = this.buzzerState.unlockTime || 0;
      if (Date.now() < unlockTime + EARLY_BUZZ_PENALTY_MS) {
        if (callbacks.send) {
          callbacks.send(ws, 'BUZZER_REJECTED', {
            message: 'Early Buzz Penalty: Please wait 0.25s after unlock!',
            isEarlyBuzzPenalty: true
          });
        }
        return;
      } else {
        delete this.earlyBuzzPlayerIds[playerId];
      }
    }

    if (currentClue.lockedOutPlayerIds && currentClue.lockedOutPlayerIds.includes(playerId)) {
      if (callbacks.send) callbacks.send(ws, 'BUZZER_REJECTED', { message: 'You are locked out for this clue' });
      return;
    }

    if (currentClue.dailyDouble && currentClue.eligiblePlayerId) {
      if (playerId !== currentClue.eligiblePlayerId) {
        console.log(`[Room ${this.roomCode}] Buzz blocked: Daily Double reserved for ${currentClue.eligiblePlayerName}`);
        if (callbacks.send) {
          callbacks.send(ws, 'BUZZER_REJECTED', { message: `Daily Double is locked for ${currentClue.eligiblePlayerName || 'selected player'}` });
        }
        return;
      }
    }

    if (!this.buzzerState.buzzedQueue) this.buzzerState.buzzedQueue = [];
    if (this.buzzerState.buzzedQueue.some(b => b.playerId === playerId)) return;

    if (!this.buzzerState.candidates) this.buzzerState.candidates = [];
    if (this.buzzerState.candidates.some(c => c.playerId === playerId)) return;

    const player = players.find(p => p.id === playerId);
    const arrivalTime = Date.now();
    const unlockTime = this.buzzerState.unlockTime || arrivalTime;
    const reportedPing = (ping !== undefined && !isNaN(ping) && ping >= 0 && ping <= 3000) ? parseInt(ping, 10) : 60;
    const oneWayDelay = Math.round(reportedPing / 2);
    const reactionTimeMs = Math.max(50, (arrivalTime - unlockTime) - oneWayDelay);

    this.buzzerState.candidates.push({
      playerId,
      playerName: player ? player.name : 'Unknown',
      reactionTimeMs,
      arrivalTime
    });

    if (this.buzzerState.state === 'UNLOCKED') {
      this.buzzerState.state = 'COLLECTING';
      this.clearCollectionTimer();
      this.collectionTimer = setTimeout(() => {
        this.resolveBuzzerWinner(roomContext, callbacks);
      }, BUZZER_COLLECTION_WINDOW_MS);
    }

    const connectedPlayers = players.filter(p => p.connected);
    if (this.buzzerState.candidates.length >= connectedPlayers.length && connectedPlayers.length > 0) {
      this.resolveBuzzerWinner(roomContext, callbacks);
    }
  }

  resolveBuzzerWinner(roomContext, callbacks = {}) {
    if (!this.buzzerState || (this.buzzerState.state !== 'COLLECTING' && this.buzzerState.state !== 'UNLOCKED')) return;

    this.clearCollectionTimer();

    const { currentClue, players } = roomContext;
    const lockedOut = (currentClue && currentClue.lockedOutPlayerIds) ? currentClue.lockedOutPlayerIds : [];
    const rawCandidates = this.buzzerState.candidates || [];
    const validCandidates = rawCandidates.filter(c => !lockedOut.includes(c.playerId));

    if (validCandidates.length === 0) {
      const eligiblePlayers = players.filter(p => p.connected && !lockedOut.includes(p.id));
      if (eligiblePlayers.length > 0 && currentClue && !currentClue.dailyDouble) {
        this.buzzerState.state = 'UNLOCKED';
        this.buzzerState.unlockTime = Date.now();
        if (callbacks.onUnlocked) callbacks.onUnlocked(this.buzzerState.unlockTime);
      } else {
        this.buzzerState.state = 'LOCKED';
        if (callbacks.onStateChanged) callbacks.onStateChanged();
      }
      return;
    }

    validCandidates.sort((a, b) => a.reactionTimeMs - b.reactionTimeMs);
    const winner = validCandidates[0];

    this.buzzerState.state = 'BUZZED';
    this.buzzerState.activePlayerId = winner.playerId;
    if (!this.buzzerState.buzzedQueue) this.buzzerState.buzzedQueue = [];
    if (!this.buzzerState.buzzedQueue.some(b => b.playerId === winner.playerId)) {
      this.buzzerState.buzzedQueue.push({
        playerId: winner.playerId,
        name: winner.playerName,
        latency: winner.reactionTimeMs,
        time: winner.arrivalTime
      });
    }

    const player = players.find(p => p.id === winner.playerId);

    this.clearAnswerTimer();
    this.answerSecondsLeft = ANSWER_TIMER_DURATION_SEC;
    this.answerTimerInterval = setInterval(() => {
      if (!currentClue || this.buzzerState.state !== 'BUZZED' || this.buzzerState.activePlayerId !== winner.playerId) {
        this.clearAnswerTimer();
        return;
      }

      this.answerSecondsLeft--;

      if (this.answerSecondsLeft > 0) {
        if (callbacks.onAnswerTimerTick) {
          callbacks.onAnswerTimerTick(this.answerSecondsLeft, winner.playerId, winner.playerName);
        }
      } else {
        this.clearAnswerTimer();
        console.log(`[Room ${this.roomCode}] Contestant answer timer reached 0s for ${winner.playerName}. Awaiting Host evaluation.`);
        if (callbacks.onAnswerTimerExpired) {
          callbacks.onAnswerTimerExpired(winner.playerId, winner.playerName);
        }
      }
    }, 1000);

    if (callbacks.onPlayerBuzzed) {
      callbacks.onPlayerBuzzed({
        playerId: winner.playerId,
        playerName: winner.playerName,
        playerColor: player ? player.color : '#3b82f6',
        latency: winner.reactionTimeMs,
        compensated: true,
        answerSecondsLeft: ANSWER_TIMER_DURATION_SEC,
        buzzerState: this.buzzerState
      });
    }

    console.log(`[Room ${this.roomCode}] Fair buzz winner awarded: ${winner.playerName} (Reaction: ${winner.reactionTimeMs}ms)`);
  }

  reset() {
    this.clearAnswerTimer();
    this.clearCountdownTimer();
    this.clearCollectionTimer();
    this.earlyBuzzPlayerIds = {};
    this.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [], candidates: [] };
  }

  destroy() {
    this.reset();
  }
}

module.exports = BuzzerEngine;
