const express = require('express');
const http = require('http');
const path = require('path');
const { PORT, PUBLIC_DIR } = require('./src/config');
const apiRoutes = require('./src/routes/apiRoutes');
const { setupWebSocketServer } = require('./src/websocket/wsServer');
const tunnelService = require('./src/services/tunnelService');

const app = express();
const server = http.createServer(app);

// CORS & Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(PUBLIC_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// HTTP Routes & REST APIs
app.use(apiRoutes);

// WebSocket Server
setupWebSocketServer(server);

// Start Server
server.listen(PORT, async () => {
  console.log(`\n==================================================`);
  console.log(`  Jeopardy Game Server running on port ${PORT}`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`==================================================\n`);

  if (process.argv.includes('--public') || process.env.PUBLIC_TUNNEL === 'true') {
    await tunnelService.startPublicTunnel(PORT);
  }
});
