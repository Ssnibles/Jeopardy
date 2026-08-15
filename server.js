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
function resolveBuzzerWinner(roomCode) {
  const room = rooms[roomCode];
  if (!room || !room.buzzerState || (room.buzzerState.state !== 'COLLECTING' && room.buzzerState.state !== 'UNLOCKED')) return;

  if (room.buzzerState.collectionTimer) {
    clearTimeout(room.buzzerState.collectionTimer);
    room.buzzerState.collectionTimer = null;
  }

  const candidates = room.buzzerState.candidates || [];
  if (candidates.length === 0) {
    room.buzzerState.state = 'UNLOCKED';
    return;
  }

  // Sort candidate buzzes by lowest reactionTimeMs (Fair network compensation!)
  candidates.sort((a, b) => a.reactionTimeMs - b.reactionTimeMs);
  const winner = candidates[0];

  room.buzzerState.state = 'BUZZED';
  room.buzzerState.activePlayerId = winner.playerId;
  if (!room.buzzerState.buzzedQueue) room.buzzerState.buzzedQueue = [];
  room.buzzerState.buzzedQueue.push({
    playerId: winner.playerId,
    name: winner.playerName,
    latency: winner.reactionTimeMs,
    time: winner.arrivalTime
  });

  const player = room.players.find(p => p.id === winner.playerId);

  broadcastRoom(roomCode, 'PLAYER_BUZZED', {
    playerId: winner.playerId,
    playerName: winner.playerName,
    playerColor: player ? player.color : '#3b82f6',
    latency: winner.reactionTimeMs,
    compensated: true,
    buzzerState: getPublicRoomState(room).buzzerState
  });

  console.log(`[Room ${roomCode}] Fair buzz winner awarded: ${winner.playerName} (Reaction: ${winner.reactionTimeMs}ms, Compensated)`);
}

function checkGameOver(room) {
  if (!room || !room.gamePack || !room.gamePack.categories) return false;
  let totalClues = 0;
  room.gamePack.categories.forEach(c => {
    totalClues += (c.clues || []).length;
  });
  const revealedCount = Object.keys(room.boardState).length;
  if (totalClues > 0 && revealedCount >= totalClues) {
    triggerGameOver(room);
    return true;
  }
  return false;
}

// Helper: Get sanitized room state for broadcast
function getPublicRoomState(room) {
  const standings = calculateStandings(room);
  return {
    roomCode: room.code,
    publicUrl: publicUrl,
    title: room.gamePack ? room.gamePack.title : 'Jeopardy Game',
    categories: room.gamePack ? room.gamePack.categories.map(cat => ({
      name: cat.name,
      clues: cat.clues.map(c => ({ value: c.value }))
    })) : [],
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      color: p.color,
      avatar: p.avatar || '',
      connected: p.connected
    })),
    boardState: room.boardState,
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
      wagerSet: room.currentClue.wagerSet || false,
      answerRevealed: room.currentClue.answerRevealed || false,
      answer: room.currentClue.answerRevealed ? room.currentClue.answer : undefined
    } : null,
    buzzerState: room.buzzerState,
    controllingPlayerId: room.controllingPlayerId || null,
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
        return send(ws, 'PONG');
      }

      switch (type) {
        // --- 1. CREATE OR ATTACH ROOM (HOST) ---
        case 'CREATE_ROOM': {
          let code = msg.roomCode ? msg.roomCode.toUpperCase() : generateRoomCode();
          if (!msg.roomCode) {
            while (rooms[code]) code = generateRoomCode();
          }

          let room = rooms[code];
          if (!room) {
            let pack = msg.gamePack;
            if (!pack) {
              const defaultPath = path.join(__dirname, 'default_game.json');
              if (fs.existsSync(defaultPath)) {
                try { pack = JSON.parse(fs.readFileSync(defaultPath, 'utf8')); } catch (e) {}
              }
            }

            room = {
              code,
              hostWs: ws,
              boardWs: null,
              gamePack: pack,
              players: [],
              boardState: {}, // key: "catIndex-clueIndex" -> true if done
              currentClue: null,
              buzzerState: { state: 'LOCKED', activePlayerId: null, buzzedQueue: [] },
              controllingPlayerId: null,
              lastActivity: Date.now()
            };
            rooms[code] = room;
          } else {
            room.hostWs = ws;
            if (msg.gamePack) room.gamePack = msg.gamePack;
            room.lastActivity = Date.now();
          }

          clientMeta = { role: 'HOST', roomCode: code, playerId: null };
          send(ws, 'ROOM_CREATED', { roomCode: code, state: getPublicRoomState(room), fullPack: room.gamePack });
          console.log(`[Room ${code}] Host attached/created.`);
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
          const category = room.gamePack.categories[catIndex];
          if (!category) return;
          const clueObj = category.clues[clueIndex];
          if (!clueObj) return;

          const clueKey = `${catIndex}-${clueIndex}`;
          if (room.boardState[clueKey]) return; // already revealed

          let defaultEligibleId = room.controllingPlayerId || (room.players.length > 0 ? room.players[0].id : null);
          let defaultEligiblePlayer = room.players.find(p => p.id === defaultEligibleId);

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
            wager: clueObj.value,
            wagerSet: !clueObj.dailyDouble,
            answerRevealed: false
          };

          room.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [] };

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
            broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
            console.log(`[Room ${roomCode}] Daily Double assigned to ${targetPlayer.name} (${targetPlayer.id})`);
          }
          break;
        }

        // --- 5. SET DAILY DOUBLE WAGER ---
        case 'SET_WAGER': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue || !room.currentClue.dailyDouble) return;

          const wagerVal = parseInt(msg.wager, 10) || 0;
          room.currentClue.wager = Math.max(0, wagerVal);
          room.currentClue.wagerSet = true;

          broadcastRoom(roomCode, 'WAGER_SET', { state: getPublicRoomState(room), wager: room.currentClue.wager });
          break;
        }

        // --- 6. UNLOCK BUZZERS / START COUNTDOWN (HOST) ---
        case 'START_BUZZER_COUNTDOWN':
        case 'UNLOCK_BUZZERS': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue) return;

          if (room.countdownTimer) {
            clearInterval(room.countdownTimer);
            room.countdownTimer = null;
          }

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

        // --- 7. PRESS BUZZER (PLAYER - LATENCY COMPENSATED) ---
        case 'PRESS_BUZZER': {
          const { roomCode, playerId } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue || clientMeta.role !== 'PLAYER') return;
          if (room.buzzerState.state !== 'UNLOCKED' && room.buzzerState.state !== 'COLLECTING') return;

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
          const rawReaction = parseInt(msg.reactionTimeMs, 10);
          const arrivalTime = Date.now();
          const fallbackReaction = room.buzzerState.unlockTime ? Math.max(50, arrivalTime - room.buzzerState.unlockTime) : 100;
          const reactionTimeMs = (!isNaN(rawReaction) && rawReaction >= 50 && rawReaction <= 10000) ? rawReaction : fallbackReaction;

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

          const { isCorrect } = msg;
          const activePlayerId = room.buzzerState.activePlayerId || room.currentClue.eligiblePlayerId || msg.playerId;
          const player = room.players.find(p => p.id === activePlayerId);
          const clueVal = room.currentClue.wager || room.currentClue.value;

          if (player) {
            if (isCorrect) {
              player.score += clueVal;
              room.controllingPlayerId = player.id;
              room.buzzerState.state = 'LOCKED';
              const key = `${room.currentClue.catIndex}-${room.currentClue.clueIndex}`;
              room.boardState[key] = true;
              room.currentClue.answerRevealed = true;
            } else {
              player.score -= clueVal;
              room.buzzerState.state = 'LOCKED'; // Host can reset buzzers or close clue
              room.currentClue.answerRevealed = true;
            }
          } else {
            room.currentClue.answerRevealed = true;
          }

          broadcastRoom(roomCode, 'ANSWER_EVALUATED', {
            isCorrect,
            playerId: activePlayerId,
            playerName: player ? player.name : '',
            scoreChange: isCorrect ? clueVal : -clueVal,
            answer: room.currentClue.answer,
            state: getPublicRoomState(room)
          });

          if (isCorrect) {
            checkGameOver(room);
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

          const key = `${room.currentClue.catIndex}-${room.currentClue.clueIndex}`;
          room.boardState[key] = true;
          room.currentClue = null;
          room.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [] };

          broadcastRoom(roomCode, 'CLUE_CLOSED', { state: getPublicRoomState(room) });
          checkGameOver(room);
          break;
        }

        // --- 12. TRIGGER GAME OVER / WINSCREEN (HOST) ---
        case 'TRIGGER_GAME_OVER': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          triggerGameOver(room);
          break;
        }

        // --- 13. RESET GAME BOARD & SCORES (HOST) ---
        case 'RESET_GAME': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          room.boardState = {};
          room.currentClue = null;
          room.buzzerState = { state: 'LOCKED', activePlayerId: null, buzzedQueue: [] };
          room.isGameOver = false;
          room.winner = null;
          room.players.forEach(p => p.score = 0);

          broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
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

        // --- 13. KICK PLAYER (HOST) ---
        case 'KICK_PLAYER': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || clientMeta.role !== 'HOST') return;

          room.players = room.players.filter(p => p.id !== msg.playerId);
          broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
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
