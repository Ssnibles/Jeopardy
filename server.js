const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Multer in-memory storage configuration for image uploads (no disk storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Route handlers for HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/creator', (req, res) => res.sendFile(path.join(__dirname, 'public', 'creator.html')));
app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));
app.get('/player', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player.html')));
app.get('/board', (req, res) => res.sendFile(path.join(__dirname, 'public', 'board.html')));

// In-memory avatar storage to prevent sending huge Base64 strings over WebSockets/URLs
const avatarStore = {}; // avatarId -> { buffer, mime, createdAt }

// Cleanup avatars older than 24 hours
setInterval(() => {
  const now = Date.now();
  Object.keys(avatarStore).forEach(id => {
    if (now - avatarStore[id].createdAt > 24 * 60 * 60 * 1000) {
      delete avatarStore[id];
    }
  });
}, 60 * 60 * 1000);

// Image upload API endpoint (returns short server URL instead of raw Base64 Data URL)
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  const mime = req.file.mimetype || 'image/png';
  const id = 'av_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  avatarStore[id] = {
    buffer: req.file.buffer,
    mime: mime,
    createdAt: Date.now()
  };
  res.json({ success: true, url: `/api/avatar/${id}` });
});

// Serve avatar image with HTTP caching headers
app.get('/api/avatar/:id', (req, res) => {
  const avatar = avatarStore[req.params.id];
  if (!avatar) {
    return res.status(404).send('Avatar not found');
  }
  res.setHeader('Content-Type', avatar.mime);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(avatar.buffer);
});

// API route to list available game packs (.json files in workspace and packs folder)
app.get('/api/packs', (req, res) => {
  try {
    const packs = [];
    const dirsToScan = [
      { dir: __dirname, rel: '' },
      { dir: path.join(__dirname, 'packs'), rel: 'packs/' }
    ];

    dirsToScan.forEach(({ dir, rel }) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file.endsWith('.json') && file !== 'package.json' && file !== 'package-lock.json') {
          try {
            const content = fs.readFileSync(path.join(dir, file), 'utf8');
            const json = JSON.parse(content);
            if (json.categories || json.round1 || json.title) {
              const packPath = rel ? `${rel}${file}` : file;
              packs.push({
                filename: packPath,
                title: json.title || file.replace('.json', ''),
                packData: json
              });
            }
          } catch (e) {}
        }
      });
    });

    res.json({ packs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read game packs' });
  }
});

let publicUrl = null;
let tunnelProcess = null;

async function startPublicTunnel() {
  return new Promise((resolve) => {
    try {
      // Use cloudflared quick tunnel (free, no account, native WebSocket support)
      tunnelProcess = spawn('npx', ['-y', 'cloudflared', 'tunnel', '--url', `http://localhost:${PORT}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
      });

      let resolved = false;

      function parseUrl(data) {
        const output = data.toString();
        // cloudflared prints the URL to stderr
        const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          resolved = true;
          publicUrl = match[0];
          console.log(`\n==================================================`);
          console.log(`  PUBLIC INTERNET ACCESSIBLE TUNNEL OPENED!`);
          console.log(`  Public Link: ${publicUrl}`);
          console.log(`  Share this link with players anywhere in the world!`);
          console.log(`==================================================\n`);
          // Broadcast room state to active rooms so TV display and clients update instantly
          Object.keys(rooms).forEach(code => {
            broadcastRoom(code, 'ROOM_STATE', { state: getPublicRoomState(rooms[code]) });
          });
          resolve(publicUrl);
        }
      }

      tunnelProcess.stdout.on('data', parseUrl);
      tunnelProcess.stderr.on('data', parseUrl);

      tunnelProcess.on('close', (code) => {
        console.log(`[Tunnel] cloudflared process exited (code ${code}).`);
        publicUrl = null;
        tunnelProcess = null;
        Object.keys(rooms).forEach(code => {
          broadcastRoom(code, 'ROOM_STATE', { state: getPublicRoomState(rooms[code]) });
        });
      });

      // Timeout: if URL isn't found within 15 seconds, give up
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error('[Tunnel Error] Timed out waiting for cloudflared URL.');
          resolve(null);
        }
      }, 15000);
    } catch (err) {
      console.error('[Tunnel Error] Failed to start cloudflared:', err.message);
      resolve(null);
    }
  });
}

app.get('/api/tunnel', (req, res) => {
  res.json({ publicUrl });
});

app.get('/api/tunnel/start', async (req, res) => {
  if (publicUrl) return res.json({ success: true, publicUrl });
  const url = await startPublicTunnel();
  if (url) {
    Object.keys(rooms).forEach(code => {
      broadcastRoom(code, 'ROOM_STATE', { state: getPublicRoomState(rooms[code]) });
    });
    res.json({ success: true, publicUrl: url });
  } else {
    res.status(500).json({ success: false, error: 'Could not create public tunnel' });
  }
});

// Default game pack endpoint
app.get('/api/default-game', (req, res) => {
  const defaultPath = path.join(__dirname, 'default_game.json');
  if (fs.existsSync(defaultPath)) {
    return res.sendFile(defaultPath);
  }
  res.status(404).json({ error: 'Default game not found' });
});

// Helper: Generate 4-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// In-memory room store
// rooms[roomCode] = { code, hostWs, gamePack, players: [], boardState: {}, currentClue: null, buzzerState: {}, lastActivity: timestamp }
const rooms = {};

// Grace period before marking a player as disconnected (allows tunnel reconnections)
const DISCONNECT_GRACE_MS = 5000;
const disconnectTimers = {}; // playerId -> timeout handle

// Periodic cleanup timer for empty/stale rooms (runs every 15 mins)
setInterval(() => {
  const now = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  Object.keys(rooms).forEach(code => {
    const room = rooms[code];
    const hostActive = room.hostWs && room.hostWs.readyState === WebSocket.OPEN;
    const boardActive = room.boardWs && room.boardWs.readyState === WebSocket.OPEN;
    const playersActive = room.players.some(p => p.ws && p.ws.readyState === WebSocket.OPEN);

    if (!hostActive && !boardActive && !playersActive && (now - (room.lastActivity || 0) > 30 * 60 * 1000)) {
      console.log(`[Room Cleanup] Pruned inactive room ${code}`);
      delete rooms[code];
    } else if (now - (room.lastActivity || 0) > TWO_HOURS) {
      console.log(`[Room Cleanup] Pruned stale room ${code}`);
      delete rooms[code];
    }
  });
}, 15 * 60 * 1000);

// Helper: Send JSON over WS
function send(ws, type, data = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

// Helper: Broadcast to all clients in a room
function broadcastRoom(roomCode, type, data = {}) {
  const room = rooms[roomCode];
  if (!room) return;
  const payload = JSON.stringify({ type, ...data });

  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
    room.hostWs.send(payload);
  }
  
  if (room.boardWs && room.boardWs.readyState === WebSocket.OPEN) {
    room.boardWs.send(payload);
  }

  room.players.forEach(p => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(payload);
    }
  });
}

// Helper: Get active category list for current round
function loadPackFile(packFileName) {
  if (!packFileName) return null;
  try {
    const safeName = path.normalize(packFileName).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(__dirname, safeName);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    }
  } catch (e) {
    console.error(`Failed to load pack file ${packFileName}:`, e);
  }
  return null;
}

function buildDualRoundPack(pack1, pack2) {
  if (!pack1 && !pack2) return null;
  if (pack1 && !pack2) return pack1;
  if (!pack1 && pack2) return pack2;

  const r1Cats = pack1.categories || (pack1.round1 ? pack1.round1.categories : []);
  const r2CatsRaw = pack2.categories || (pack2.round2 ? pack2.round2.categories : (pack2.round1 ? pack2.round1.categories : []));

  const r2Cats = r2CatsRaw.map(cat => ({
    name: cat.name,
    clues: (cat.clues || []).map((c, i) => ({
      ...c,
      value: (i + 1) * 400
    }))
  }));

  // Pick Final Jeopardy: Prioritize pack2 (the second pack) if valid, otherwise fallback to pack1
  const hasFJ2 = pack2.finalJeopardy && (pack2.finalJeopardy.clue || pack2.finalJeopardy.category);
  const hasFJ1 = pack1.finalJeopardy && (pack1.finalJeopardy.clue || pack1.finalJeopardy.category);
  const fj = hasFJ2 ? pack2.finalJeopardy : (hasFJ1 ? pack1.finalJeopardy : (pack2.finalJeopardy || pack1.finalJeopardy || null));

  return {
    title: `${pack1.title || 'Round 1'} / ${pack2.title || 'Round 2'}`,
    round1: {
      title: pack1.round1 ? (pack1.round1.title || 'Jeopardy! Round') : 'Jeopardy! Round',
      categories: r1Cats
    },
    round2: {
      title: pack2.round2 ? (pack2.round2.title || 'Double Jeopardy! Round') : 'Double Jeopardy! Round',
      categories: r2Cats
    },
    finalJeopardy: fj
  };
}

function getActiveCategories(room) {
  if (!room || !room.gamePack) return [];
  const pack = room.gamePack.gamePack || room.gamePack;
  const currentRound = room.currentRound || 'JEOPARDY';

  // Primary categories from top-level `categories`, `round1`, or `round`
  const r1 = (Array.isArray(pack.categories) && pack.categories.length > 0)
    ? pack.categories
    : (pack.round1 && Array.isArray(pack.round1.categories) ? pack.round1.categories : (pack.round && Array.isArray(pack.round.categories) ? pack.round.categories : []));

  const r2 = (pack.round2 && Array.isArray(pack.round2.categories) && pack.round2.categories.length > 0)
    ? pack.round2.categories
    : null;

  if (currentRound === 'DOUBLE_JEOPARDY') {
    if (r2) return r2;
    // Auto-scale clue values for Double Jeopardy round ($400 - $2000)
    return r1.map((cat) => ({
      name: cat.name,
      clues: (cat.clues || []).map((c, i) => ({
        ...c,
        value: (i + 1) * 400
      }))
    }));
  }

  return r1;
}

function getBoardState(room) {
  const currentRound = room.currentRound || 'JEOPARDY';
  if (currentRound === 'DOUBLE_JEOPARDY') {
    if (!room.round2BoardState) room.round2BoardState = {};
    return room.round2BoardState;
  }
  if (!room.round1BoardState) room.round1BoardState = room.boardState || {};
  return room.round1BoardState;
}

function getLowestScoringPlayerId(room) {
  if (!room || !room.players || room.players.length === 0) return null;
  const sorted = [...room.players].sort((a, b) => a.score - b.score);
  return sorted[0].id;
}

// Helper: Calculate game over state and standings
function calculateStandings(room) {
  return [...room.players].sort((a, b) => b.score - a.score);
}

function triggerGameOver(room) {
  room.isGameOver = true;
  const standings = calculateStandings(room);
  room.winner = standings.length > 0 ? standings[0] : null;
  broadcastRoom(room.code, 'GAME_OVER', {
    state: getPublicRoomState(room),
    rankings: standings
  });
}

function clearAnswerTimer(room) {
  if (room && room.answerTimerInterval) {
    clearInterval(room.answerTimerInterval);
    room.answerTimerInterval = null;
  }
}

function resolveBuzzerWinner(roomCode) {
  const room = rooms[roomCode];
  if (!room || !room.buzzerState || (room.buzzerState.state !== 'COLLECTING' && room.buzzerState.state !== 'UNLOCKED')) return;

  if (room.buzzerState.collectionTimer) {
    clearTimeout(room.buzzerState.collectionTimer);
    room.buzzerState.collectionTimer = null;
  }

  const lockedOut = (room.currentClue && room.currentClue.lockedOutPlayerIds) ? room.currentClue.lockedOutPlayerIds : [];
  const rawCandidates = room.buzzerState.candidates || [];
  const validCandidates = rawCandidates.filter(c => !lockedOut.includes(c.playerId));

  if (validCandidates.length === 0) {
    const eligiblePlayers = room.players.filter(p => p.connected && !lockedOut.includes(p.id));
    if (eligiblePlayers.length > 0 && room.currentClue && !room.currentClue.dailyDouble) {
      room.buzzerState.state = 'UNLOCKED';
      room.buzzerState.unlockTime = Date.now();
      broadcastRoom(roomCode, 'BUZZERS_UNLOCKED', { timestamp: room.buzzerState.unlockTime, state: getPublicRoomState(room) });
    } else {
      room.buzzerState.state = 'LOCKED';
      broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
    }
    return;
  }

  // Sort candidate buzzes by lowest reactionTimeMs (Fair network compensation!)
  validCandidates.sort((a, b) => a.reactionTimeMs - b.reactionTimeMs);
  const winner = validCandidates[0];

  room.buzzerState.state = 'BUZZED';
  room.buzzerState.activePlayerId = winner.playerId;
  if (!room.buzzerState.buzzedQueue) room.buzzerState.buzzedQueue = [];
  if (!room.buzzerState.buzzedQueue.some(b => b.playerId === winner.playerId)) {
    room.buzzerState.buzzedQueue.push({
      playerId: winner.playerId,
      name: winner.playerName,
      latency: winner.reactionTimeMs,
      time: winner.arrivalTime
    });
  }

  const player = room.players.find(p => p.id === winner.playerId);

  // Clear existing answer timer if any
  clearAnswerTimer(room);

  // 7-Second Answer Timer after player buzzes in
  room.answerSecondsLeft = 7;
  room.answerTimerInterval = setInterval(() => {
    if (!rooms[roomCode] || !room.currentClue || room.buzzerState.state !== 'BUZZED' || room.buzzerState.activePlayerId !== winner.playerId) {
      clearAnswerTimer(room);
      return;
    }

    room.answerSecondsLeft--;

    if (room.answerSecondsLeft > 0) {
      broadcastRoom(roomCode, 'ANSWER_TIMER_TICK', {
        secondsLeft: room.answerSecondsLeft,
        activePlayerId: winner.playerId,
        activePlayerName: winner.playerName
      });
    } else {
      clearAnswerTimer(room);
      console.log(`[Room ${roomCode}] Contestant answer timer reached 0s for ${winner.playerName}. Awaiting Host evaluation.`);
      broadcastRoom(roomCode, 'ANSWER_TIMER_EXPIRED', {
        secondsLeft: 0,
        activePlayerId: winner.playerId,
        activePlayerName: winner.playerName,
        state: getPublicRoomState(room)
      });
    }
  }, 1000);

  broadcastRoom(roomCode, 'PLAYER_BUZZED', {
    playerId: winner.playerId,
    playerName: winner.playerName,
    playerColor: player ? player.color : '#3b82f6',
    latency: winner.reactionTimeMs,
    compensated: true,
    answerSecondsLeft: 7,
    buzzerState: getPublicRoomState(room).buzzerState
  });

  console.log(`[Room ${roomCode}] Fair buzz winner awarded: ${winner.playerName} (Reaction: ${winner.reactionTimeMs}ms)`);
}

function startFinalJeopardy(room) {
  if (!room) return;
  if (room.finalJeopardy && room.finalJeopardy.state === 'FINISHED') return;

  room.currentRound = 'FINAL_JEOPARDY';
  const packFJ = (room.gamePack && room.gamePack.finalJeopardy) ? room.gamePack.finalJeopardy : null;
  const fjCategory = packFJ ? packFJ.category : 'World History & Explorers';
  const fjClue = packFJ ? packFJ.clue : 'This Portuguese explorer was the first European to reach India by sea, opening the Cape Route in 1498.';
  const fjAnswer = packFJ ? packFJ.answer : 'Vasco da Gama';

  // Disqualify players with score <= 0 per broadcast show rules
  const disqualified = room.players.filter(p => p.score <= 0).map(p => p.id);
  room.disqualifiedPlayerIds = disqualified;

  room.finalJeopardy = {
    state: 'WAGER', // WAGER -> CLUE -> EVALUATION -> FINISHED
    category: fjCategory,
    clue: fjClue,
    answer: fjAnswer,
    wagers: {},
    responses: {},
    evaluated: {}
  };

  broadcastRoom(room.code, 'FINAL_JEOPARDY_STARTED', {
    state: getPublicRoomState(room),
    disqualifiedPlayerIds: disqualified
  });
  console.log(`[Room ${room.code}] Final Jeopardy Round started! Category: ${fjCategory}. Disqualified: ${disqualified.length} players.`);
}

function checkGameOver(room) {
  if (!room || !room.gamePack) return false;
  const currentRound = room.currentRound || 'JEOPARDY';
  const cats = getActiveCategories(room);
  let totalClues = 0;
  cats.forEach(c => {
    totalClues += (c.clues || []).length;
  });
  const bState = getBoardState(room);
  const revealedCount = Object.keys(bState).length;

  if (totalClues > 0 && revealedCount >= totalClues) {
    if (currentRound === 'JEOPARDY') {
      if (room.gameMode === 'BLITZ') {
        startFinalJeopardy(room);
      } else {
        room.currentRound = 'DOUBLE_JEOPARDY';
        room.currentClue = null;
        room.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [] };
        room.controllingPlayerId = getLowestScoringPlayerId(room);
        broadcastRoom(room.code, 'ROUND_TRANSITION', {
          newRound: 'DOUBLE_JEOPARDY',
          state: getPublicRoomState(room)
        });
        console.log(`[Room ${room.code}] Standard mode: Advanced to Double Jeopardy! Board control -> lowest scorer.`);
      }
      return false;
    } else if (currentRound === 'DOUBLE_JEOPARDY') {
      if (!room.finalJeopardy) {
        startFinalJeopardy(room);
      }
      return false;
    }
  }
  return false;
}

// Helper: Get sanitised room state for broadcast
function getPublicRoomState(room) {
  const standings = calculateStandings(room);
  const activeCats = getActiveCategories(room);
  const bState = getBoardState(room);
  let maxClueVal = 1000;
  activeCats.forEach(cat => {
    (cat.clues || []).forEach(c => {
      if (c.value && c.value > maxClueVal) maxClueVal = c.value;
    });
  });

  const eligiblePlayer = room.players.find(p => p.id === (room.currentClue && room.currentClue.eligiblePlayerId));
  const maxWager = eligiblePlayer ? Math.max(eligiblePlayer.score, maxClueVal) : maxClueVal;

  return {
    roomCode: room.code,
    publicUrl: publicUrl,
    title: room.gamePack ? room.gamePack.title : 'Jeopardy Game',
    gameMode: room.gameMode || 'STANDARD',
    currentRound: room.currentRound || 'JEOPARDY',
    roundTitle: room.currentRound === 'DOUBLE_JEOPARDY' ? 'Double Jeopardy!' : (room.currentRound === 'FINAL_JEOPARDY' ? 'Final Jeopardy!' : 'Jeopardy! Round'),
    categories: activeCats.map(cat => ({
      name: cat.name,
      clues: (cat.clues || []).map(c => ({ value: c.value }))
    })),
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      color: p.color,
      avatar: p.avatar || '',
      connected: p.connected,
      isDisqualified: (room.disqualifiedPlayerIds || []).includes(p.id)
    })),
    disqualifiedPlayerIds: room.disqualifiedPlayerIds || [],
    boardState: bState,
    currentClue: room.currentClue ? {
      catIndex: room.currentClue.catIndex,
      clueIndex: room.currentClue.clueIndex,
      categoryName: room.currentClue.categoryName,
      value: room.currentClue.wager || room.currentClue.value,
      clue: room.currentClue.clue,
      image: room.currentClue.image,
      dailyDouble: room.currentClue.dailyDouble,
      eligiblePlayerId: room.currentClue.eligiblePlayerId || null,
      eligiblePlayerName: room.currentClue.eligiblePlayerName || null,
      wager: room.currentClue.wager || room.currentClue.value,
      maxWager: maxWager,
      wagerSet: room.currentClue.wagerSet || false,
      lockedOutPlayerIds: room.currentClue.lockedOutPlayerIds || [],
      answerRevealed: room.currentClue.answerRevealed || false,
      answer: room.currentClue.answerRevealed ? room.currentClue.answer : undefined
    } : null,
    buzzerState: room.buzzerState,
    controllingPlayerId: room.controllingPlayerId || (room.players.length > 0 ? room.players[0].id : null),
    finalJeopardy: room.finalJeopardy ? {
      state: room.finalJeopardy.state,
      category: room.finalJeopardy.category,
      clue: (room.finalJeopardy.state === 'CLUE' || room.finalJeopardy.state === 'EVALUATION' || room.finalJeopardy.state === 'FINISHED') ? room.finalJeopardy.clue : undefined,
      answer: room.finalJeopardy.answer || '',
      wagers: room.finalJeopardy.wagers || {},
      responses: room.finalJeopardy.responses || {},
      evaluated: room.finalJeopardy.evaluated || {}
    } : null,
    isGameOver: room.isGameOver || false,
    winner: room.winner || (standings.length > 0 ? standings[0] : null),
    rankings: standings
  };
}

// Heartbeat ping interval to keep tunneling TCP connections alive and detect stale sockets
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

let connIdCounter = 0;

wss.on('connection', (ws) => {
  connIdCounter++;
  const connId = connIdCounter;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  console.log(`[Conn#${connId}] New WebSocket connection opened`);

  let clientMeta = { role: null, roomCode: null, playerId: null };

  ws.on('message', (rawMessage) => {
    ws.isAlive = true;
    try {
      const msg = JSON.parse(rawMessage);
      const { type } = msg;

      if (type === 'PING') {
        return send(ws, 'PONG', { clientTime: msg.clientTime });
      }

      switch (type) {
        // --- 1. CREATE OR ATTACH ROOM (HOST) ---
        case 'CREATE_ROOM': {
          let code = msg.roomCode ? msg.roomCode.toUpperCase() : generateRoomCode();
          if (!msg.roomCode) {
            while (rooms[code]) code = generateRoomCode();
          }

          let pack1 = msg.gamePackRound1 || msg.gamePack;
          if (!pack1 && msg.packFileNameRound1) pack1 = loadPackFile(msg.packFileNameRound1);
          if (!pack1 && msg.packFileName) pack1 = loadPackFile(msg.packFileName);

          let pack2 = msg.gamePackRound2;
          if (!pack2 && msg.packFileNameRound2) pack2 = loadPackFile(msg.packFileNameRound2);

          let finalPack = null;
          if (pack1 && pack2 && (msg.gameMode || 'STANDARD') === 'STANDARD') {
            finalPack = buildDualRoundPack(pack1, pack2);
          } else {
            finalPack = pack1 || pack2;
          }

          if (!finalPack) {
            const defaultPath = path.join(__dirname, 'default_game.json');
            if (fs.existsSync(defaultPath)) {
              try { finalPack = JSON.parse(fs.readFileSync(defaultPath, 'utf8')); } catch (e) {}
            }
          }

          let room = rooms[code];
          if (!room) {
            room = {
              code,
              hostWs: ws,
              boardWs: null,
              gamePack: finalPack,
              gameMode: msg.gameMode || 'STANDARD',
              currentRound: 'JEOPARDY',
              players: [],
              boardState: {},
              round1BoardState: {},
              round2BoardState: {},
              earlyBuzzPlayerIds: {},
              disqualifiedPlayerIds: [],
              currentClue: null,
              buzzerState: { state: 'LOCKED', activePlayerId: null, buzzedQueue: [] },
              controllingPlayerId: null,
              lastActivity: Date.now()
            };
            rooms[code] = room;
          } else {
            room.hostWs = ws;
            if (finalPack) room.gamePack = finalPack;
            if (msg.gameMode) room.gameMode = msg.gameMode;
            if (!room.gamePack) {
              const defaultPath = path.join(__dirname, 'default_game.json');
              if (fs.existsSync(defaultPath)) {
                try { room.gamePack = JSON.parse(fs.readFileSync(defaultPath, 'utf8')); } catch (e) {}
              }
            }
            room.lastActivity = Date.now();
          }

          clientMeta = { role: 'HOST', roomCode: code, playerId: null };
          send(ws, 'ROOM_CREATED', { roomCode: code, state: getPublicRoomState(room), fullPack: room.gamePack });
          console.log(`[Room ${code}] Host attached/created (Mode: ${room.gameMode}).`);
          break;
        }

        // --- 2. CONNECT TV BOARD SCREEN ---
        case 'JOIN_BOARD': {
          const roomCode = (msg.roomCode || '').toUpperCase();
          const room = rooms[roomCode];
          if (!room) {
            return send(ws, 'ERROR', { message: 'Room not found' });
          }
          room.boardWs = ws;
          clientMeta = { role: 'BOARD', roomCode, playerId: null };
          send(ws, 'BOARD_JOINED', { roomCode, state: getPublicRoomState(room) });
          console.log(`[Room ${roomCode}] TV Board Display connected.`);
          break;
        }

        // --- 3. JOIN ROOM (PLAYER) ---
        case 'JOIN_ROOM': {
          const roomCode = (msg.roomCode || '').toUpperCase();
          const name = (msg.name || 'Player').trim();
          const color = msg.color || '#3b82f6';
          const avatar = msg.avatar || '';
          const msgPlayerId = msg.playerId || (clientMeta && clientMeta.playerId) || '';
          const room = rooms[roomCode];

          if (!room) {
            console.log(`[Conn#${connId}] JOIN_ROOM failed: room ${roomCode} not found`);
            return send(ws, 'ERROR', { message: 'Room not found. Check room code.' });
          }

          console.log(`[Conn#${connId}] JOIN_ROOM for room=${roomCode} name=${name} playerId=${msgPlayerId || '(none)'}`);

          // 1. Check by msgPlayerId or clientMeta.playerId
          let existingPlayer = msgPlayerId ? room.players.find(p => p.id === msgPlayerId) : null;

          // 2. Check by current socket connection
          if (!existingPlayer) {
            existingPlayer = room.players.find(p => p.ws === ws);
          }

          // 3. Fallback: check by case-insensitive name match
          if (!existingPlayer) {
            existingPlayer = room.players.find(p => p.name.toLowerCase() === name.toLowerCase());
          }

          let playerId;

          if (existingPlayer) {
            // Cancel any pending disconnect grace timer for this player
            if (disconnectTimers[existingPlayer.id]) {
              clearTimeout(disconnectTimers[existingPlayer.id]);
              delete disconnectTimers[existingPlayer.id];
            }

            if (existingPlayer.ws && existingPlayer.ws !== ws) {
              try {
                // Remove server-side close listener so the old socket doesn't
                // trigger the disconnect grace period after reconnection
                existingPlayer.ws.removeAllListeners('close');
                existingPlayer.ws.close();
              } catch (e) {}
            }
            existingPlayer.ws = ws;
            existingPlayer.connected = true;
            existingPlayer.name = name;
            existingPlayer.color = color;
            if (avatar) existingPlayer.avatar = avatar;
            playerId = existingPlayer.id;
            console.log(`[Conn#${connId}] [Room ${roomCode}] Player RECONNECTED: ${name} (${playerId}) connected=${existingPlayer.connected}`);
          } else {
            playerId = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            const newPlayer = {
              id: playerId,
              name,
              score: 0,
              color,
              avatar,
              connected: true,
              ws
            };
            room.players.push(newPlayer);
            console.log(`[Conn#${connId}] [Room ${roomCode}] New player joined: ${name} (${playerId})`);
          }

          if (!room.controllingPlayerId && room.players.length > 0) {
            room.controllingPlayerId = room.players[0].id;
          }

          clientMeta = { role: 'PLAYER', roomCode, playerId };
          room.lastActivity = Date.now();
          send(ws, 'PLAYER_JOIN_SUCCESS', { playerId, roomCode, state: getPublicRoomState(room) });

          // Broadcast updated state to room
          broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
          break;
        }

        // --- 3b. REQUEST STATE SYNC (any client) ---
        case 'REQUEST_STATE': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room) return;
          send(ws, 'ROOM_STATE', { state: getPublicRoomState(room) });
          break;
        }

        // --- 4. SELECT CLUE (HOST) ---
        case 'SELECT_CLUE': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          const { catIndex, clueIndex } = msg;
          const activeCats = getActiveCategories(room);
          const category = activeCats[catIndex];
          if (!category) return;
          const clueObj = category.clues ? category.clues[clueIndex] : null;
          if (!clueObj) return;

          const bState = getBoardState(room);
          const clueKey = `${catIndex}-${clueIndex}`;
          if (bState[clueKey]) return; // already revealed

          if (!room.controllingPlayerId && room.players.length > 0) {
            room.controllingPlayerId = room.players[0].id;
          }

          let defaultEligibleId = room.controllingPlayerId || (room.players.length > 0 ? room.players[0].id : null);
          let defaultEligiblePlayer = room.players.find(p => p.id === defaultEligibleId);
          let defaultDailyDoubleWager = clueObj.value * 2;
          if (defaultEligiblePlayer && defaultEligiblePlayer.score > defaultDailyDoubleWager) {
            defaultDailyDoubleWager = defaultEligiblePlayer.score;
          }

          room.currentClue = {
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

          room.earlyBuzzPlayerIds = {};
          if (clueObj.dailyDouble) {
            room.buzzerState = { state: 'DAILY_DOUBLE', activePlayerId: defaultEligibleId, buzzedQueue: [] };
          } else {
            room.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [] };
          }

          broadcastRoom(roomCode, 'CLUE_SELECTED', {
            state: getPublicRoomState(room),
            clueObj: {
              ...room.currentClue,
              answer: clientMeta.role === 'HOST' ? clueObj.answer : undefined
            }
          });
          // Send full clue including answer specifically to Host
          send(room.hostWs, 'HOST_CLUE_DETAILS', { clue: room.currentClue });
          break;
        }

        // --- 4b. SET DAILY DOUBLE PLAYER (HOST) ---
        case 'SET_DAILY_DOUBLE_PLAYER': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue || !room.currentClue.dailyDouble || clientMeta.role !== 'HOST') return;

          const { playerId } = msg;
          const targetPlayer = room.players.find(p => p.id === playerId);
          if (targetPlayer) {
            room.currentClue.eligiblePlayerId = targetPlayer.id;
            room.currentClue.eligiblePlayerName = targetPlayer.name;
            room.controllingPlayerId = targetPlayer.id;
            if (room.buzzerState) room.buzzerState.activePlayerId = targetPlayer.id;
            broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
            console.log(`[Room ${roomCode}] Daily Double assigned to ${targetPlayer.name} (${targetPlayer.id})`);
          }
          break;
        }

        // --- 4c. SET CONTROLLING PLAYER (HOST) ---
        case 'SET_CONTROLLING_PLAYER': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          const { playerId } = msg;
          const targetPlayer = room.players.find(p => p.id === playerId);
          if (targetPlayer) {
            room.controllingPlayerId = targetPlayer.id;
            broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
            console.log(`[Room ${roomCode}] Host assigned board control to ${targetPlayer.name}`);
          }
          break;
        }

        // --- 5. SET DAILY DOUBLE WAGER ---
        case 'SET_WAGER': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue || !room.currentClue.dailyDouble) return;

          let maxClueVal = 1000;
          const activeCats = getActiveCategories(room);
          activeCats.forEach(cat => {
            (cat.clues || []).forEach(c => {
              if (c.value && c.value > maxClueVal) maxClueVal = c.value;
            });
          });

          const eligiblePlayer = room.players.find(p => p.id === room.currentClue.eligiblePlayerId);
          const playerMaxWager = eligiblePlayer ? Math.max(eligiblePlayer.score, maxClueVal) : maxClueVal;

          const wagerVal = parseInt(msg.wager, 10) || 5;
          const validatedWager = Math.max(5, Math.min(wagerVal, playerMaxWager));

          room.currentClue.wager = validatedWager;
          room.currentClue.wagerSet = true;
          room.buzzerState = { state: 'DAILY_DOUBLE', activePlayerId: room.currentClue.eligiblePlayerId, buzzedQueue: [] };

          const statePayload = getPublicRoomState(room);
          broadcastRoom(roomCode, 'WAGER_SET', { state: statePayload, wager: room.currentClue.wager });
          broadcastRoom(roomCode, 'ROOM_STATE', { state: statePayload });
          break;
        }

        // --- 6. UNLOCK BUZZERS / START COUNTDOWN (HOST) ---
        case 'START_BUZZER_COUNTDOWN':
        case 'UNLOCK_BUZZERS': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue || clientMeta.role !== 'HOST') return;

          if (room.countdownTimer) {
            clearInterval(room.countdownTimer);
            room.countdownTimer = null;
          }

          room.earlyBuzzPlayerIds = {};

          const durationSeconds = msg.instant ? 0 : (msg.duration !== undefined ? parseInt(msg.duration, 10) : 3);

          if (durationSeconds <= 0) {
            room.buzzerState = { state: 'UNLOCKED', activePlayerId: null, buzzedQueue: [], unlockTime: Date.now() };
            broadcastRoom(roomCode, 'BUZZERS_UNLOCKED', { timestamp: room.buzzerState.unlockTime, state: getPublicRoomState(room) });
          } else {
            room.buzzerState = { state: 'COUNTDOWN', countdownSec: durationSeconds, activePlayerId: null, buzzedQueue: [] };
            broadcastRoom(roomCode, 'BUZZER_COUNTDOWN', { secondsLeft: durationSeconds, state: getPublicRoomState(room) });

            let currentSec = durationSeconds;
            room.countdownTimer = setInterval(() => {
              currentSec--;
              if (currentSec > 0) {
                room.buzzerState.countdownSec = currentSec;
                broadcastRoom(roomCode, 'BUZZER_COUNTDOWN', { secondsLeft: currentSec, state: getPublicRoomState(room) });
              } else {
                clearInterval(room.countdownTimer);
                room.countdownTimer = null;
                room.buzzerState = { state: 'UNLOCKED', activePlayerId: null, buzzedQueue: [], unlockTime: Date.now() };
                broadcastRoom(roomCode, 'BUZZERS_UNLOCKED', { timestamp: room.buzzerState.unlockTime, state: getPublicRoomState(room) });
              }
            }, 1000);
          }
          break;
        }

        // --- 7. PRESS BUZZER (PLAYER - LATENCY COMPENSATED + EARLY LOCKOUT) ---
        case 'PRESS_BUZZER': {
          const { roomCode, playerId } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue || clientMeta.role !== 'PLAYER') return;

          if (!room.earlyBuzzPlayerIds) room.earlyBuzzPlayerIds = {};

          // 1. Early buzz penalty registration (pressed during countdown or locked state)
          if (room.buzzerState.state === 'COUNTDOWN' || room.buzzerState.state === 'LOCKED') {
            room.earlyBuzzPlayerIds[playerId] = Date.now();
            send(ws, 'EARLY_BUZZ_PENALTY', { message: 'Early Buzz! 250ms penalty applied when buzzers unlock.' });
            console.log(`[Room ${roomCode}] Early buzz penalty registered for player ${playerId}`);
            return;
          }

          if (room.buzzerState.state !== 'UNLOCKED' && room.buzzerState.state !== 'COLLECTING') return;

          // 2. Enforce 250ms early buzz lockout after unlock time
          if (room.earlyBuzzPlayerIds[playerId]) {
            const unlockTime = room.buzzerState.unlockTime || 0;
            if (Date.now() < unlockTime + 250) {
              return send(ws, 'BUZZER_REJECTED', {
                message: 'Early Buzz Penalty: Please wait 0.25s after unlock!',
                isEarlyBuzzPenalty: true
              });
            } else {
              delete room.earlyBuzzPlayerIds[playerId];
            }
          }

          // Check if player is locked out on this clue
          if (room.currentClue.lockedOutPlayerIds && room.currentClue.lockedOutPlayerIds.includes(playerId)) {
            return send(ws, 'BUZZER_REJECTED', { message: 'You are locked out for this clue' });
          }

          // Exclusive Daily Double Validation!
          if (room.currentClue.dailyDouble && room.currentClue.eligiblePlayerId) {
            if (playerId !== room.currentClue.eligiblePlayerId) {
              console.log(`[Room ${roomCode}] Buzz blocked: Daily Double reserved for ${room.currentClue.eligiblePlayerName}`);
              return send(ws, 'BUZZER_REJECTED', { message: `Daily Double is locked for ${room.currentClue.eligiblePlayerName || 'selected player'}` });
            }
          }

          // Check if player already buzzed out this round or submitted candidate
          if (room.buzzerState.buzzedQueue.some(b => b.playerId === playerId)) return;
          if (!room.buzzerState.candidates) room.buzzerState.candidates = [];
          if (room.buzzerState.candidates.some(c => c.playerId === playerId)) return;

          const player = room.players.find(p => p.id === playerId);
          const arrivalTime = Date.now();
          const unlockTime = room.buzzerState.unlockTime || arrivalTime;
          const reportedPing = (msg.ping !== undefined && !isNaN(msg.ping) && msg.ping >= 0 && msg.ping <= 3000) ? parseInt(msg.ping, 10) : 60;
          const oneWayDelay = Math.round(reportedPing / 2);
          // Real physical press delay relative to unlock time
          const reactionTimeMs = Math.max(50, (arrivalTime - unlockTime) - oneWayDelay);

          room.buzzerState.candidates.push({
            playerId,
            playerName: player ? player.name : 'Unknown',
            reactionTimeMs,
            arrivalTime
          });

          // Start 250ms collection window on first arriving buzz to buffer high-ping players
          if (room.buzzerState.state === 'UNLOCKED') {
            room.buzzerState.state = 'COLLECTING';
            room.buzzerState.collectionTimer = setTimeout(() => {
              resolveBuzzerWinner(roomCode);
            }, 250);
          }

          // If all connected players have buzzed, resolve immediately
          const connectedPlayers = room.players.filter(p => p.connected);
          if (room.buzzerState.candidates.length >= connectedPlayers.length && connectedPlayers.length > 0) {
            resolveBuzzerWinner(roomCode);
          }
          break;
        }

        // --- 8. EVALUATE ANSWER (HOST) ---
        case 'EVALUATE_ANSWER': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue || clientMeta.role !== 'HOST') return;

          clearAnswerTimer(room);
          if (room.countdownTimer) {
            clearInterval(room.countdownTimer);
            room.countdownTimer = null;
          }

          const { isCorrect } = msg;
          const activePlayerId = room.buzzerState.activePlayerId || room.currentClue.eligiblePlayerId || msg.playerId;
          const player = room.players.find(p => p.id === activePlayerId);
          const clueVal = room.currentClue.wager || room.currentClue.value;

          if (!room.currentClue.lockedOutPlayerIds) room.currentClue.lockedOutPlayerIds = [];

          if (player) {
            if (isCorrect) {
              player.score += clueVal;
              room.controllingPlayerId = player.id;
              room.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [], candidates: [] };
              const bState = getBoardState(room);
              const key = `${room.currentClue.catIndex}-${room.currentClue.clueIndex}`;
              bState[key] = true;
              room.currentClue.answerRevealed = true;

              broadcastRoom(roomCode, 'ANSWER_EVALUATED', {
                isCorrect: true,
                playerId: activePlayerId,
                playerName: player.name,
                scoreChange: clueVal,
                answer: room.currentClue.answer,
                state: getPublicRoomState(room)
              });

              checkGameOver(room);
            } else {
              player.score -= clueVal;

              if (!room.currentClue.lockedOutPlayerIds.includes(player.id)) {
                room.currentClue.lockedOutPlayerIds.push(player.id);
              }

              if (!room.controllingPlayerId) {
                room.controllingPlayerId = player.id;
              }

              room.buzzerState.activePlayerId = null;

              const remainingCandidates = (room.buzzerState.candidates || []).filter(c => !room.currentClue.lockedOutPlayerIds.includes(c.playerId));

              if (remainingCandidates.length > 0) {
                broadcastRoom(roomCode, 'ANSWER_EVALUATED', {
                  isCorrect: false,
                  playerId: activePlayerId,
                  playerName: player.name,
                  scoreChange: -clueVal,
                  answer: room.currentClue.answerRevealed ? room.currentClue.answer : undefined,
                  state: getPublicRoomState(room)
                });
                resolveBuzzerWinner(roomCode);
              } else {
                const eligiblePlayers = room.players.filter(p => p.connected && !room.currentClue.lockedOutPlayerIds.includes(p.id));
                if (eligiblePlayers.length > 0 && !room.currentClue.dailyDouble) {
                  room.buzzerState = { state: 'UNLOCKED', activePlayerId: null, buzzedQueue: [], candidates: [], unlockTime: Date.now() };
                  broadcastRoom(roomCode, 'ANSWER_EVALUATED', {
                    isCorrect: false,
                    playerId: activePlayerId,
                    playerName: player.name,
                    scoreChange: -clueVal,
                    answer: room.currentClue.answerRevealed ? room.currentClue.answer : undefined,
                    state: getPublicRoomState(room)
                  });
                  broadcastRoom(roomCode, 'BUZZERS_UNLOCKED', { timestamp: room.buzzerState.unlockTime, state: getPublicRoomState(room) });
                } else {
                  room.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [], candidates: [] };
                  room.currentClue.answerRevealed = true;
                  broadcastRoom(roomCode, 'ANSWER_EVALUATED', {
                    isCorrect: false,
                    playerId: activePlayerId,
                    playerName: player.name,
                    scoreChange: -clueVal,
                    answer: room.currentClue.answer,
                    state: getPublicRoomState(room)
                  });
                }
              }
            }
          } else {
            room.currentClue.answerRevealed = true;
            broadcastRoom(roomCode, 'ANSWER_EVALUATED', {
              isCorrect: false,
              playerId: activePlayerId,
              playerName: '',
              scoreChange: -clueVal,
              answer: room.currentClue.answer,
              state: getPublicRoomState(room)
            });
          }
          break;
        }

        // --- 9. REVEAL ANSWER (HOST) ---
        case 'REVEAL_ANSWER': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue || clientMeta.role !== 'HOST') return;

          room.currentClue.answerRevealed = true;
          broadcastRoom(roomCode, 'ANSWER_REVEALED', { answer: room.currentClue.answer });
          break;
        }

        // --- 10. RESET BUZZERS (HOST) ---
        case 'RESET_BUZZERS': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue || clientMeta.role !== 'HOST') return;

          clearAnswerTimer(room);
          room.earlyBuzzPlayerIds = {};
          room.buzzerState.state = 'UNLOCKED';
          room.buzzerState.activePlayerId = null;
          room.buzzerState.unlockTime = Date.now();

          broadcastRoom(roomCode, 'BUZZERS_UNLOCKED', { timestamp: room.buzzerState.unlockTime, state: getPublicRoomState(room) });
          break;
        }

        // --- 11. CLOSE CLUE & RETURN TO BOARD (HOST) ---
        case 'CLOSE_CLUE': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue || clientMeta.role !== 'HOST') return;

          clearAnswerTimer(room);
          const bState = getBoardState(room);
          const key = `${room.currentClue.catIndex}-${room.currentClue.clueIndex}`;
          bState[key] = true;
          const closedClueAnswer = room.currentClue.answer;
          room.currentClue = null;
          room.earlyBuzzPlayerIds = {};
          room.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [] };

          broadcastRoom(roomCode, 'CLUE_CLOSED', { state: getPublicRoomState(room), answer: closedClueAnswer });
          checkGameOver(room);
          break;
        }

        // --- 12. TRIGGER GAME OVER / WINSCREEN (HOST) ---
        case 'TRIGGER_GAME_OVER': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          clearAnswerTimer(room);
          triggerGameOver(room);
          break;
        }

        // --- 13. RESET GAME BOARD & SCORES (HOST) ---
        case 'RESET_GAME': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          clearAnswerTimer(room);
          room.currentRound = 'JEOPARDY';
          room.boardState = {};
          room.round1BoardState = {};
          room.round2BoardState = {};
          room.earlyBuzzPlayerIds = {};
          room.disqualifiedPlayerIds = [];
          room.currentClue = null;
          room.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [] };
          room.finalJeopardy = null;
          room.isGameOver = false;
          room.winner = null;
          room.players.forEach(p => p.score = 0);
          if (room.players.length > 0) room.controllingPlayerId = room.players[0].id;

          broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
          break;
        }

        // --- 13b. CHANGE GAME PACK DIRECTLY FROM DASHBOARD (HOST) ---
        case 'CHANGE_GAME_PACK': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          let pack1 = msg.gamePackRound1 || msg.gamePack;
          if (!pack1 && msg.packFileNameRound1) pack1 = loadPackFile(msg.packFileNameRound1);
          if (!pack1 && msg.packFileName) pack1 = loadPackFile(msg.packFileName);

          let pack2 = msg.gamePackRound2;
          if (!pack2 && msg.packFileNameRound2) pack2 = loadPackFile(msg.packFileNameRound2);

          let newPack = null;
          if (pack1 && pack2 && (msg.gameMode || room.gameMode || 'STANDARD') === 'STANDARD') {
            newPack = buildDualRoundPack(pack1, pack2);
          } else {
            newPack = pack1 || pack2;
          }

          if (newPack || msg.gameMode) {
            clearAnswerTimer(room);
            if (newPack) room.gamePack = newPack;
            if (msg.gameMode) room.gameMode = msg.gameMode;

            room.currentRound = 'JEOPARDY';
            room.boardState = {};
            room.round1BoardState = {};
            room.round2BoardState = {};
            room.earlyBuzzPlayerIds = {};
            room.disqualifiedPlayerIds = [];
            room.currentClue = null;
            room.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [] };
            room.finalJeopardy = null;
            room.isGameOver = false;
            room.winner = null;

            if (msg.keepPlayers !== false) {
              (room.players || []).forEach(p => { p.score = 0; });
            } else {
              room.players = [];
            }
            room.controllingPlayerId = room.players.length > 0 ? room.players[0].id : null;

            broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
            console.log(`[Room ${roomCode}] Host changed active game pack/mode (Mode: ${room.gameMode}, KeepPlayers: ${msg.keepPlayers !== false})`);
          } else {
            send(ws, 'ERROR', { message: 'Failed to load selected game pack.' });
          }
          break;
        }

        // --- 14. MANUAL SCORE ADJUSTMENT (HOST) ---
        case 'ADJUST_SCORE': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          const { playerId, delta } = msg;
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.score += (parseInt(delta, 10) || 0);
            broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
          }
          break;
        }

        // --- 15. KICK PLAYER (HOST) ---
        case 'KICK_PLAYER': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          room.players = room.players.filter(p => p.id !== msg.playerId);
          if (room.controllingPlayerId === msg.playerId) {
            room.controllingPlayerId = room.players.length > 0 ? room.players[0].id : null;
          }
          broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
          break;
        }

        // --- 15b. ADVANCE ROUND MANUALLY (HOST) ---
        case 'ADVANCE_ROUND': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          clearAnswerTimer(room);

          if (room.currentRound === 'JEOPARDY') {
            room.currentRound = 'DOUBLE_JEOPARDY';
            room.currentClue = null;
            room.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [] };
            room.controllingPlayerId = getLowestScoringPlayerId(room);
            broadcastRoom(roomCode, 'ROUND_TRANSITION', { newRound: 'DOUBLE_JEOPARDY', state: getPublicRoomState(room) });
            console.log(`[Room ${roomCode}] Host manually advanced to Double Jeopardy! Control -> lowest scorer.`);
          } else if (room.currentRound === 'DOUBLE_JEOPARDY') {
            startFinalJeopardy(room);
          }
          break;
        }

        // --- 16. START FINAL JEOPARDY (HOST) ---
        case 'START_FINAL_JEOPARDY': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          startFinalJeopardy(room);
          break;
        }

        // --- 17. SUBMIT FINAL JEOPARDY WAGER (PLAYER) ---
        case 'SUBMIT_FINAL_WAGER': {
          const { roomCode, playerId } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.finalJeopardy || clientMeta.role !== 'PLAYER') return;

          if (room.disqualifiedPlayerIds && room.disqualifiedPlayerIds.includes(playerId)) {
            return send(ws, 'ERROR', { message: 'You are disqualified from Final Jeopardy due to a score of $0 or less.' });
          }

          const player = room.players.find(p => p.id === playerId);
          if (!player) return;

          const maxW = Math.max(0, player.score);
          const rawWager = parseInt(msg.wager, 10);
          const validatedWager = isNaN(rawWager) ? 0 : Math.max(0, Math.min(rawWager, maxW));

          if (!room.finalJeopardy.wagers) room.finalJeopardy.wagers = {};
          room.finalJeopardy.wagers[playerId] = validatedWager;

          broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
          console.log(`[Room ${roomCode}] Final Jeopardy Wager set by ${player.name}: $${validatedWager}`);
          break;
        }

        // --- 18. REVEAL FINAL JEOPARDY CLUE (HOST) ---
        case 'REVEAL_FINAL_CLUE': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.finalJeopardy || clientMeta.role !== 'HOST') return;

          room.finalJeopardy.state = 'CLUE';
          broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
          console.log(`[Room ${roomCode}] Final Jeopardy Clue revealed!`);
          break;
        }

        // --- 18b. START FINAL JEOPARDY EVALUATION (HOST) ---
        case 'START_FINAL_EVALUATION': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.finalJeopardy || clientMeta.role !== 'HOST') return;

          room.finalJeopardy.state = 'EVALUATION';
          broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
          console.log(`[Room ${roomCode}] Final Jeopardy Evaluation phase started!`);
          break;
        }

        // --- 19. SUBMIT FINAL JEOPARDY RESPONSE (PLAYER) ---
        case 'SUBMIT_FINAL_RESPONSE': {
          const { roomCode, playerId } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.finalJeopardy || clientMeta.role !== 'PLAYER') return;

          if (room.disqualifiedPlayerIds && room.disqualifiedPlayerIds.includes(playerId)) {
            return send(ws, 'ERROR', { message: 'You are disqualified from Final Jeopardy due to a score of $0 or less.' });
          }

          const player = room.players.find(p => p.id === playerId);
          if (!player) return;

          if (!room.finalJeopardy.responses) room.finalJeopardy.responses = {};
          room.finalJeopardy.responses[playerId] = (msg.response || '').trim();

          broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
          console.log(`[Room ${roomCode}] Final Jeopardy Response submitted by ${player.name}`);
          break;
        }

        // --- 20. EVALUATE FINAL JEOPARDY PLAYER (HOST) ---
        case 'EVALUATE_FINAL_PLAYER': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.finalJeopardy || clientMeta.role !== 'HOST') return;

          const { targetPlayerId, isCorrect } = msg;
          const player = room.players.find(p => p.id === targetPlayerId);
          if (player) {
            const wager = room.finalJeopardy.wagers[targetPlayerId] || 0;

            // Undo previous evaluation score adjustment if already evaluated
            if (room.finalJeopardy.evaluated && room.finalJeopardy.evaluated[targetPlayerId]) {
              const prevEval = room.finalJeopardy.evaluated[targetPlayerId];
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

            if (!room.finalJeopardy.evaluated) room.finalJeopardy.evaluated = {};
            room.finalJeopardy.evaluated[targetPlayerId] = {
              isCorrect: !!isCorrect,
              wager: wager,
              response: room.finalJeopardy.responses[targetPlayerId] || '(No answer)'
            };

            broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
          }
          break;
        }

        // --- 21. FINISH FINAL JEOPARDY & DECLARE WINNER (HOST) ---
        case 'FINISH_FINAL_JEOPARDY': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          if (room.finalJeopardy) room.finalJeopardy.state = 'FINISHED';
          triggerGameOver(room);
          break;
        }

        default:
          console.warn(`Unknown message type received: ${type}`);
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    const { roomCode, playerId, role } = clientMeta;
    if (!roomCode || !rooms[roomCode]) return;
    const room = rooms[roomCode];

    if (role === 'PLAYER' && playerId) {
      const player = room.players.find(p => p.id === playerId);
      // Only start disconnect grace period if this closing socket is still
      // the player's active socket. If they already reconnected on a new
      // socket, player.ws !== ws and we must NOT touch their status.
      if (player && player.ws === ws) {
        // Grace period: wait before marking offline to allow tunnel reconnections
        if (disconnectTimers[playerId]) clearTimeout(disconnectTimers[playerId]);
        disconnectTimers[playerId] = setTimeout(() => {
          delete disconnectTimers[playerId];
          // Re-check that the socket hasn't been replaced during the grace period
          if (player.ws === ws) {
            player.connected = false;
            broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
            console.log(`[Room ${roomCode}] Player disconnected: ${player.name} (${playerId})`);
          }
        }, DISCONNECT_GRACE_MS);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`\n==================================================`);
  console.log(`  Jeopardy Game Server running on port ${PORT}`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`==================================================\n`);

  if (process.argv.includes('--public') || process.env.PUBLIC_TUNNEL === 'true') {
    await startPublicTunnel();
  }
});
