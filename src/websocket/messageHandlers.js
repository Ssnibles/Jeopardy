const { dispatch } = require('./dispatcher');

function handleMessage(ws, rawMessage, clientMeta, connId) {
  dispatch(ws, rawMessage, clientMeta, connId);
}

module.exports = { handleMessage };
