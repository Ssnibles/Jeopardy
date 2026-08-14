const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration for custom question image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.png';
    cb(null, 'img-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Route handlers for HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/creator', (req, res) => res.sendFile(path.join(__dirname, 'public', 'creator.html')));
app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));
app.get('/player', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player.html')));
app.get('/board', (req, res) => res.sendFile(path.join(__dirname, 'public', 'board.html')));

// Image upload API endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: imageUrl });
});

let publicUrl = null;

async function startPublicTunnel() {
  try {
    const localtunnel = require('localtunnel');
    const tunnel = await localtunnel({ port: PORT });
    publicUrl = tunnel.url;
    console.log(`\n==================================================`);
    console.log(`  🌐 PUBLIC INTERNET ACCESSIBLE TUNNEL OPENED!`);
    console.log(`  Public Link: ${publicUrl}`);
    console.log(`  Share this link with players anywhere in the world!`);
    console.log(`==================================================\n`);

    tunnel.on('close', () => {
      console.log('[Tunnel] Public tunnel closed.');
      publicUrl = null;
    });
    return publicUrl;
  } catch (err) {
    console.error('[Tunnel Error] Failed to open localtunnel:', err.message);
    return null;
  }
}

app.get('/api/tunnel', (req, res) => {
  res.json({ publicUrl });
});

app.get('/api/tunnel/start', async (req, res) => {
  if (publicUrl) return res.json({ success: true, publicUrl });
  const url = await startPublicTunnel();
  if (url) {
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
// rooms[roomCode] = { code, hostWs, gamePack, players: [], boardState: {}, currentClue: null, buzzerState: {} }
const rooms = {};

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

// Helper: Get sanitized room state for broadcast
function getPublicRoomState(room) {
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
      wagerSet: room.currentClue.wagerSet || false,
      answerRevealed: room.currentClue.answerRevealed || false,
    } : null,
    buzzerState: room.buzzerState,
    controllingPlayerId: room.controllingPlayerId || null
  };
}

wss.on('connection', (ws) => {
  let clientMeta = { role: null, roomCode: null, playerId: null };

  ws.on('message', (rawMessage) => {
    try {
      const msg = JSON.parse(rawMessage);
      const { type } = msg;

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
              controllingPlayerId: null
            };
            rooms[code] = room;
          } else {
            room.hostWs = ws;
            if (msg.gamePack) room.gamePack = msg.gamePack;
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
          const room = rooms[roomCode];

          if (!room) {
            return send(ws, 'ERROR', { message: 'Room not found. Check room code.' });
          }

          // Check if player re-joining
          let existingPlayer = room.players.find(p => p.name.toLowerCase() === name.toLowerCase());
          let playerId;

          if (existingPlayer) {
            existingPlayer.ws = ws;
            existingPlayer.connected = true;
            existingPlayer.color = color;
            if (avatar) existingPlayer.avatar = avatar;
            playerId = existingPlayer.id;
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
          }

          clientMeta = { role: 'PLAYER', roomCode, playerId };
          send(ws, 'PLAYER_JOIN_SUCCESS', { playerId, roomCode, state: getPublicRoomState(room) });

          // Broadcast updated state to room
          broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
          console.log(`[Room ${roomCode}] Player joined: ${name} (${playerId})`);
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

          room.currentClue = {
            catIndex,
            clueIndex,
            categoryName: category.name,
            value: clueObj.value,
            clue: clueObj.clue,
            answer: clueObj.answer,
            image: clueObj.image || '',
            dailyDouble: !!clueObj.dailyDouble,
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

        // --- 6. UNLOCK BUZZERS (HOST) ---
        case 'UNLOCK_BUZZERS': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue) return;

          room.buzzerState.state = 'UNLOCKED';
          room.buzzerState.activePlayerId = null;
          room.buzzerState.unlockTime = Date.now();

          broadcastRoom(roomCode, 'BUZZERS_UNLOCKED', { timestamp: room.buzzerState.unlockTime });
          break;
        }

        // --- 7. PRESS BUZZER (PLAYER) ---
        case 'PRESS_BUZZER': {
          const { roomCode, playerId } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue || clientMeta.role !== 'PLAYER') return;
          if (room.buzzerState.state !== 'UNLOCKED') return;

          // Check if player already buzzed out this round
          if (room.buzzerState.buzzedQueue.some(b => b.playerId === playerId)) return;

          const pressTime = Date.now();
          const latency = room.buzzerState.unlockTime ? pressTime - room.buzzerState.unlockTime : 0;
          const player = room.players.find(p => p.id === playerId);

          room.buzzerState.state = 'BUZZED';
          room.buzzerState.activePlayerId = playerId;
          room.buzzerState.buzzedQueue.push({ playerId, name: player ? player.name : 'Unknown', latency, time: pressTime });

          broadcastRoom(roomCode, 'PLAYER_BUZZED', {
            playerId,
            playerName: player ? player.name : 'Unknown',
            playerColor: player ? player.color : '#3b82f6',
            latency,
            buzzerState: room.buzzerState
          });
          console.log(`[Room ${roomCode}] Buzz winner: ${player ? player.name : playerId} (+${latency}ms)`);
          break;
        }

        // --- 8. EVALUATE ANSWER (HOST) ---
        case 'EVALUATE_ANSWER': {
          const { roomCode } = clientMeta;
          const room = rooms[roomCode];
          if (!room || !room.currentClue || clientMeta.role !== 'HOST') return;

          const { isCorrect } = msg;
          const activePlayerId = room.buzzerState.activePlayerId || msg.playerId;
          const player = room.players.find(p => p.id === activePlayerId);
          const clueVal = room.currentClue.wager || room.currentClue.value;

          if (player) {
            if (isCorrect) {
              player.score += clueVal;
              room.controllingPlayerId = player.id;
              room.buzzerState.state = 'LOCKED';
              const key = `${room.currentClue.catIndex}-${room.currentClue.clueIndex}`;
              room.boardState[key] = true;
            } else {
              player.score -= clueVal;
              room.buzzerState.state = 'LOCKED'; // Host can reset buzzers or close clue
            }
          }

          broadcastRoom(roomCode, 'ANSWER_EVALUATED', {
            isCorrect,
            playerId: activePlayerId,
            playerName: player ? player.name : '',
            scoreChange: isCorrect ? clueVal : -clueVal,
            state: getPublicRoomState(room)
          });
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

          broadcastRoom(roomCode, 'BUZZERS_UNLOCKED', { timestamp: room.buzzerState.unlockTime });
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
          break;
        }

        // --- 12. MANUAL SCORE ADJUSTMENT (HOST) ---
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
      if (player) {
        player.connected = false;
        broadcastRoom(roomCode, 'ROOM_STATE', { state: getPublicRoomState(room) });
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
