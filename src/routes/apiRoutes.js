const express = require('express');
const path = require('path');
const multer = require('multer');
const { PUBLIC_DIR, DEFAULT_GAME_PATH } = require('../config');
const avatarService = require('../services/avatarService');
const packService = require('../services/packService');
const tunnelService = require('../services/tunnelService');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// HTML Page Routes
router.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
router.get('/creator', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'creator.html')));
router.get('/host', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'host.html')));
router.get('/player', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'player.html')));
router.get('/board', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'board.html')));

// Image Upload API
router.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  const id = avatarService.saveAvatar(req.file.buffer, req.file.mimetype);
  res.json({ success: true, url: `/api/avatar/${id}` });
});

// Avatar Serve API
router.get('/api/avatar/:id', (req, res) => {
  const avatar = avatarService.getAvatar(req.params.id);
  if (!avatar) {
    return res.status(404).send('Avatar not found');
  }
  res.setHeader('Content-Type', avatar.mime);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(avatar.buffer);
});

// Packs API
router.get('/api/packs', (req, res) => {
  try {
    const packs = packService.listAvailablePacks();
    res.json({ packs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read game packs' });
  }
});

// Default Game Pack API
router.get('/api/default-game', (req, res) => {
  const fs = require('fs');
  if (fs.existsSync(DEFAULT_GAME_PATH)) {
    return res.sendFile(DEFAULT_GAME_PATH);
  }
  res.status(404).json({ error: 'Default game not found' });
});

// Cloudflare Tunnel APIs
router.get('/api/tunnel', (req, res) => {
  res.json({ publicUrl: tunnelService.getPublicUrl() });
});

router.get('/api/tunnel/start', async (req, res) => {
  if (tunnelService.getPublicUrl()) {
    return res.json({ success: true, publicUrl: tunnelService.getPublicUrl() });
  }
  const url = await tunnelService.startPublicTunnel();
  if (url) {
    res.json({ success: true, publicUrl: url });
  } else {
    res.status(500).json({ success: false, error: 'Could not create public tunnel' });
  }
});

module.exports = router;
