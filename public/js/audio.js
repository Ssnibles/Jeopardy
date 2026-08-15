// Web Audio API Synthesizer for Jeopardy game sounds & Think Music
class SoundFX {
  constructor() {
    this.ctx = null;
    this.thinkInterval = null;
    this.isMusicPlaying = false;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopThinkMusic();
    }
    return this.isMuted;
  }

  // Classic buzzer buzz (sawtooth, low freq)
  playBuzzer() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  // Correct answer chime
  playCorrect() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      gain.gain.setValueAtTime(0.2, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.25);
    });
  }

  // Wrong answer double-buzz
  playWrong() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [180, 140].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.25, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.15 + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.12);
    });
  }

  // Daily Double fan-fare
  playDailyDouble() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51]; // A4, C#5, E5, A5, C#6, E6

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.3, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.35);
    });
  }

  // Countdown tick sound (woodblock click)
  playCountdownTick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Countdown GO chime
  playCountdownGo() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.50, now); // C6
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Winner Fanfare
  playWinnerFanfare() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const melody = [
      { f: 523.25, t: 0 },    // C5
      { f: 523.25, t: 0.15 }, // C5
      { f: 523.25, t: 0.30 }, // C5
      { f: 659.25, t: 0.45 }, // E5
      { f: 783.99, t: 0.60 }, // G5
      { f: 1046.50, t: 0.85 } // C6 (long)
    ];

    melody.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const duration = note.t === 0.85 ? 0.8 : 0.12;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0.3, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + note.t);
      osc.stop(now + note.t + duration);
    });
  }

  // Iconic Jeopardy Think Music (Synthesized Marimba/Vibraphone Melody)
  startThinkMusic() {
    if (this.isMusicPlaying || this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    this.isMusicPlaying = true;

    // Frequencies for C major / F major Jeopardy Think Theme
    const C4 = 261.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, Bb4 = 466.16, B4 = 493.88;
    const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46;

    // Sequence of notes: { f: freq, d: duration (seconds), b: isBass }
    const sequence = [
      // Phrase 1
      { f: C5, d: 0.25 }, { f: F5, d: 0.25 }, { f: C5, d: 0.25 }, { f: A4, d: 0.25 },
      { f: C5, d: 0.25 }, { f: F5, d: 0.25 }, { f: C5, d: 0.5 },
      { f: C5, d: 0.25 }, { f: F5, d: 0.25 }, { f: C5, d: 0.25 }, { f: A4, d: 0.25 },
      { f: C5, d: 0.5 },  { f: G4, d: 0.25 }, { f: A4, d: 0.25 }, { f: Bb4, d: 0.25 }, { f: B4, d: 0.25 },

      // Phrase 2
      { f: C5, d: 0.25 }, { f: F5, d: 0.25 }, { f: C5, d: 0.25 }, { f: A4, d: 0.25 },
      { f: C5, d: 0.25 }, { f: F5, d: 0.25 }, { f: C5, d: 0.5 },
      { f: F5, d: 0.35 }, { f: D5, d: 0.35 }, { f: C5, d: 0.35 }, { f: Bb4, d: 0.35 }, { f: A4, d: 0.35 }, { f: G4, d: 0.35 }, { f: F4, d: 0.5 }
    ];

    let step = 0;
    const playNextNote = () => {
      if (!this.isMusicPlaying || !this.ctx || this.isMuted) return;
      const note = sequence[step % sequence.length];
      const now = this.ctx.currentTime;

      // Melody synth (sine/triangle marimba feel)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.d * 0.9);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + note.d * 0.9);

      // Bass drone every 4 notes
      if (step % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime((step % 8 < 4) ? F4 / 2 : C4 / 2, now);
        bassGain.gain.setValueAtTime(0.1, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.8);
      }

      step++;
      this.thinkTimeout = setTimeout(playNextNote, note.d * 1000);
    };

    playNextNote();
  }

  stopThinkMusic() {
    this.isMusicPlaying = false;
    if (this.thinkTimeout) {
      clearTimeout(this.thinkTimeout);
      this.thinkTimeout = null;
    }
  }
}

window.soundFX = new SoundFX();
