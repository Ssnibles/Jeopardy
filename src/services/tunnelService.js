const { spawn } = require('child_process');
const { PORT } = require('../config');

class TunnelService {
  constructor() {
    this.publicUrl = null;
    this.tunnelProcess = null;
    this.onStateChangeCallback = null;
  }

  onStateChange(callback) {
    this.onStateChangeCallback = callback;
  }

  notifyStateChange() {
    if (typeof this.onStateChangeCallback === 'function') {
      this.onStateChangeCallback(this.publicUrl);
    }
  }

  getPublicUrl() {
    return this.publicUrl;
  }

  async startPublicTunnel(port = PORT) {
    if (this.publicUrl) return this.publicUrl;

    return new Promise((resolve) => {
      try {
        this.tunnelProcess = spawn('npx', ['-y', 'cloudflared', 'tunnel', '--url', `http://localhost:${port}`], {
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true
        });

        let resolved = false;

        const parseUrl = (data) => {
          const output = data.toString();
          const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
          if (match && !resolved) {
            resolved = true;
            this.publicUrl = match[0];
            console.log(`\n==================================================`);
            console.log(`  PUBLIC INTERNET ACCESSIBLE TUNNEL OPENED!`);
            console.log(`  Public Link: ${this.publicUrl}`);
            console.log(`  Share this link with players anywhere in the world!`);
            console.log(`==================================================\n`);
            this.notifyStateChange();
            resolve(this.publicUrl);
          }
        };

        this.tunnelProcess.stdout.on('data', parseUrl);
        this.tunnelProcess.stderr.on('data', parseUrl);

        this.tunnelProcess.on('close', (code) => {
          console.log(`[Tunnel] cloudflared process exited (code ${code}).`);
          this.publicUrl = null;
          this.tunnelProcess = null;
          this.notifyStateChange();
        });

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
}

module.exports = new TunnelService();
