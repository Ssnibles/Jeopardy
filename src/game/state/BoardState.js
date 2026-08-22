class BoardState {
  constructor() {
    this.round1BoardState = {};
    this.round2BoardState = {};
  }

  getBoardState(currentRound = 'JEOPARDY') {
    if (currentRound === 'DOUBLE_JEOPARDY') {
      if (!this.round2BoardState) this.round2BoardState = {};
      return this.round2BoardState;
    }
    if (!this.round1BoardState) this.round1BoardState = {};
    return this.round1BoardState;
  }

  isClueRevealed(currentRound, catIndex, clueIndex) {
    const bState = this.getBoardState(currentRound);
    return !!bState[`${catIndex}-${clueIndex}`];
  }

  markClueRevealed(currentRound, catIndex, clueIndex) {
    const bState = this.getBoardState(currentRound);
    bState[`${catIndex}-${clueIndex}`] = true;
  }

  getRevealedCount(currentRound = 'JEOPARDY') {
    const bState = this.getBoardState(currentRound);
    return Object.keys(bState).length;
  }

  resetBoard() {
    this.round1BoardState = {};
    this.round2BoardState = {};
  }
}

module.exports = BoardState;
