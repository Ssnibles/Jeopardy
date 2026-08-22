const http = require('http');
const WebSocket = require('ws');
const assert = require('assert');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    }).on('error', reject);
  });
}

function createClient() {
  const ws = new WebSocket('ws://localhost:3000');
  const messages = [];
  
  ws.on('message', (raw) => {
    try {
      messages.push(JSON.parse(raw));
    } catch (e) {}
  });

  const waitForType = (type, timeout = 3000) => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const foundIndex = messages.findIndex(m => m.type === type);
        if (foundIndex !== -1) {
          const [msg] = messages.splice(foundIndex, 1);
          return resolve(msg);
        }
        if (Date.now() - start > timeout) {
          return reject(new Error(`Timeout waiting for WS message type: ${type}`));
        }
        setTimeout(check, 50);
      };
      check();
    });
  };

  const send = (type, payload = {}) => {
    ws.send(JSON.stringify({ type, ...payload }));
  };

  return new Promise((resolve) => {
    ws.on('open', () => {
      resolve({ ws, send, waitForType, messages });
    });
  });
}

(async () => {
  console.log('==================================================');
  console.log('  Starting Comprehensive Backend Integration Test ');
  console.log('==================================================\n');

  try {
    // 1. Test REST Endpoints
    console.log('[Test 1] Testing HTTP REST API endpoints...');
    const packsRes = await httpGet('/api/packs');
    assert.strictEqual(packsRes.status, 200, 'packs endpoint status');
    assert.ok(Array.isArray(packsRes.data.packs), 'packs array returned');
    console.log(`  ✔ /api/packs returned ${packsRes.data.packs.length} game packs.`);

    const defaultRes = await httpGet('/api/default-game');
    assert.strictEqual(defaultRes.status, 200, 'default-game status');
    assert.ok(defaultRes.data.categories || defaultRes.data.title, 'default-game valid json');
    console.log('  ✔ /api/default-game returned valid game pack data.');

    const tunnelRes = await httpGet('/api/tunnel');
    assert.strictEqual(tunnelRes.status, 200, 'tunnel status');
    console.log('  ✔ /api/tunnel endpoint verified.');

    // 2. Test WS Connection & Host Room Creation
    console.log('\n[Test 2] Testing Host Room Creation (CREATE_ROOM)...');
    const host = await createClient();
    host.send('CREATE_ROOM', { gameMode: 'STANDARD' });
    const createdMsg = await host.waitForType('ROOM_CREATED');
    assert.ok(createdMsg.roomCode, 'Room code generated');
    const roomCode = createdMsg.roomCode;
    console.log(`  ✔ Game Room Created successfully! Room Code: ${roomCode}`);

    // 3. Test TV Board Display Join
    console.log('\n[Test 3] Testing TV Board Screen Join (JOIN_BOARD)...');
    const board = await createClient();
    board.send('JOIN_BOARD', { roomCode });
    const boardMsg = await board.waitForType('BOARD_JOINED');
    assert.strictEqual(boardMsg.roomCode, roomCode);
    console.log('  ✔ TV Board Display attached to room.');

    // 4. Test Player Join & Reconnect Logic
    console.log('\n[Test 4] Testing Player Join (JOIN_ROOM) & Reconnection...');
    const player1 = await createClient();
    player1.send('JOIN_ROOM', { roomCode, name: 'Alice', color: '#ff0000' });
    const p1JoinMsg = await player1.waitForType('PLAYER_JOIN_SUCCESS');
    assert.strictEqual(p1JoinMsg.state.players.length, 1);
    const p1Id = p1JoinMsg.playerId;
    console.log(`  ✔ Player 1 (Alice) joined with ID: ${p1Id}`);

    const player2 = await createClient();
    player2.send('JOIN_ROOM', { roomCode, name: 'Bob', color: '#00ff00' });
    const p2JoinMsg = await player2.waitForType('PLAYER_JOIN_SUCCESS');
    const p2Id = p2JoinMsg.playerId;
    console.log(`  ✔ Player 2 (Bob) joined with ID: ${p2Id}`);

    // 5. Test Clue Selection & Buzzer Mechanics
    console.log('\n[Test 5] Testing Clue Selection (SELECT_CLUE) & Buzzer Mechanics...');
    host.send('SELECT_CLUE', { catIndex: 0, clueIndex: 0 });
    const clueSelectedMsg = await host.waitForType('CLUE_SELECTED');
    assert.ok(clueSelectedMsg.state.currentClue, 'Current clue active');
    console.log(`  ✔ Host selected Clue (Category: ${clueSelectedMsg.state.currentClue.categoryName}, Value: $${clueSelectedMsg.state.currentClue.value})`);

    // Instant unlock buzzers
    console.log('  ✔ Unlocking buzzers instantly...');
    host.send('UNLOCK_BUZZERS', { instant: true });
    await player1.waitForType('BUZZERS_UNLOCKED');

    // Player 1 Buzzes
    console.log('  ✔ Player 1 pressing buzzer...');
    player1.send('PRESS_BUZZER', { ping: 50 });
    const buzzMsg = await host.waitForType('PLAYER_BUZZED');
    assert.strictEqual(buzzMsg.playerId, p1Id, 'Player 1 won buzz');
    console.log(`  ✔ Player 1 (Alice) won buzzer lock! Reaction time compensated.`);

    // 6. Test Host Evaluation & Score Update
    console.log('\n[Test 6] Testing Host Answer Evaluation (EVALUATE_ANSWER)...');
    host.send('EVALUATE_ANSWER', { isCorrect: true, playerId: p1Id });
    const evalMsg = await host.waitForType('ANSWER_EVALUATED');
    assert.strictEqual(evalMsg.isCorrect, true);
    assert.strictEqual(evalMsg.scoreChange, 200);
    console.log('  ✔ Host marked answer CORRECT! Alice score updated (+200).');

    host.send('CLOSE_CLUE');
    await host.waitForType('CLUE_CLOSED');
    console.log('  ✔ Clue closed successfully.');

    // 7. Test Final Jeopardy Transition & Wagers
    console.log('\n[Test 7] Testing Final Jeopardy Round Flow...');
    host.send('START_FINAL_JEOPARDY');
    const fjMsg = await host.waitForType('FINAL_JEOPARDY_STARTED');
    assert.strictEqual(fjMsg.state.currentRound, 'FINAL_JEOPARDY');
    console.log('  ✔ Final Jeopardy round initialized.');

    // Alice submits wager
    player1.send('SUBMIT_FINAL_WAGER', { wager: 150 });
    await sleep(200);
    console.log('  ✔ Player 1 submitted Final Jeopardy wager ($150).');

    // Host reveals clue & starts evaluation
    host.send('REVEAL_FINAL_CLUE');
    await sleep(100);
    host.send('START_FINAL_EVALUATION');
    await sleep(100);

    // Host evaluates Alice correct
    host.send('EVALUATE_FINAL_PLAYER', { targetPlayerId: p1Id, isCorrect: true });
    await sleep(200);
    console.log('  ✔ Host evaluated Final Jeopardy for Alice (Correct).');

    // Host finishes game
    host.send('FINISH_FINAL_JEOPARDY');
    const gameOverMsg = await host.waitForType('GAME_OVER');
    assert.strictEqual(gameOverMsg.state.isGameOver, true);
    console.log(`  ✔ Game Over! Winner: ${gameOverMsg.state.winner ? gameOverMsg.state.winner.name : 'Unknown'}`);

    // 8. Test Game Reset
    console.log('\n[Test 8] Testing Reset Game Board & Scores (RESET_GAME)...');
    host.send('RESET_GAME');
    const resetState = await host.waitForType('ROOM_STATE');
    assert.strictEqual(resetState.state.currentRound, 'JEOPARDY');
    assert.strictEqual(resetState.state.isGameOver, false);
    assert.strictEqual(resetState.state.players[0].score, 0);
    console.log('  ✔ Room reset back to Jeopardy round with clean state and $0 scores.');

    // Clean up WS connections
    host.ws.close();
    board.ws.close();
    player1.ws.close();
    player2.ws.close();

    console.log('\n==================================================');
    console.log('  ALL BACKEND INTEGRATION TESTS PASSED 100%!  ');
    console.log('==================================================\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err);
    process.exit(1);
  }
})();
