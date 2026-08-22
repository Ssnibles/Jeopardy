const roomHandlers = require('./handlers/roomHandlers');
const gameHandlers = require('./handlers/gameHandlers');
const buzzerHandlers = require('./handlers/buzzerHandlers');
const finalHandlers = require('./handlers/finalHandlers');

const registry = {
  ...roomHandlers,
  ...gameHandlers,
  ...buzzerHandlers,
  ...finalHandlers
};

function send(ws, type, data = {}) {
  if (ws && ws.readyState === 1) { // 1 = OPEN
    ws.send(JSON.stringify({ type, ...data }));
  }
}

function dispatch(ws, rawMessage, clientMeta, connId) {
  try {
    const msg = JSON.parse(rawMessage);
    const { type } = msg;

    if (type === 'PING') {
      return send(ws, 'PONG', { clientTime: msg.clientTime });
    }

    const handler = registry[type];
    if (handler) {
      handler(ws, msg, clientMeta, connId);
    } else {
      console.warn(`Unknown message type received: ${type}`);
    }
  } catch (err) {
    console.error('Error handling WebSocket message:', err);
  }
}

module.exports = { dispatch };
