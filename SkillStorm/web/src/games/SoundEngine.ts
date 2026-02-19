/* ═══════════════════════════════════════════════════════════
   SOUND ENGINE — Full Web Audio API Implementation
   Synthesized sound effects for all games (no external files needed)
   Supports: SFX, music layers, volume control, spatial audio
   ═══════════════════════════════════════════════════════════ */

type SoundCategory = 'sfx' | 'music' | 'ui' | 'ambient';

interface SoundConfig {
  volume: number;
  muted: boolean;
}

interface ActiveSound {
  source: AudioBufferSourceNode | OscillatorNode;
  gain: GainNode;
  id: string;
}

class SoundEngineClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private categoryGains: Map<SoundCategory, GainNode> = new Map();
  private config: Record<SoundCategory, SoundConfig> = {
    sfx: { volume: 0.7, muted: false },
    music: { volume: 0.4, muted: false },
    ui: { volume: 0.5, muted: false },
    ambient: { volume: 0.3, muted: false },
  };
  private activeSounds: ActiveSound[] = [];
  private initialized = false;

  /* ── Initialize Audio Context (must be called after user gesture) ── */
  init(): AudioContext {
    if (this.ctx && this.initialized) return this.ctx;

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.ctx.destination);

    // Create category gain nodes
    for (const cat of ['sfx', 'music', 'ui', 'ambient'] as SoundCategory[]) {
      const gain = this.ctx.createGain();
      gain.gain.value = this.config[cat].volume;
      gain.connect(this.masterGain);
      this.categoryGains.set(cat, gain);
    }

    // Load saved preferences
    try {
      const saved = localStorage.getItem('skillzstorm_sound_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(this.config, parsed);
        for (const [cat, cfg] of Object.entries(this.config)) {
          const gain = this.categoryGains.get(cat as SoundCategory);
          if (gain) {
            gain.gain.value = (cfg as SoundConfig).muted ? 0 : (cfg as SoundConfig).volume;
          }
        }
      }
    } catch {}

    this.initialized = true;
    return this.ctx;
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx || !this.initialized) return this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private getCategoryGain(category: SoundCategory): GainNode {
    return this.categoryGains.get(category) || this.masterGain!;
  }

  /* ── Volume & Mute Controls ── */
  setVolume(category: SoundCategory, volume: number) {
    this.config[category].volume = Math.max(0, Math.min(1, volume));
    const gain = this.categoryGains.get(category);
    if (gain && !this.config[category].muted) {
      gain.gain.setTargetAtTime(this.config[category].volume, this.ctx?.currentTime || 0, 0.05);
    }
    this.saveConfig();
  }

  toggleMute(category: SoundCategory) {
    this.config[category].muted = !this.config[category].muted;
    const gain = this.categoryGains.get(category);
    if (gain) {
      gain.gain.setTargetAtTime(
        this.config[category].muted ? 0 : this.config[category].volume,
        this.ctx?.currentTime || 0, 0.05
      );
    }
    this.saveConfig();
  }

  setMasterVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, volume)),
        this.ctx?.currentTime || 0, 0.05
      );
    }
  }

  private saveConfig() {
    try {
      localStorage.setItem('skillzstorm_sound_config', JSON.stringify(this.config));
    } catch {}
  }

  /* ── Core Synthesis Helpers ── */
  private playTone(
    freq: number, duration: number, type: OscillatorType = 'sine',
    category: SoundCategory = 'sfx', volumeMult = 1,
    attack = 0.01, decay = 0.1, sustain = 0.5, release = 0.1
  ) {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = type;
    osc.frequency.value = freq;

    // ADSR envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volumeMult, now + attack);
    gain.gain.linearRampToValueAtTime(volumeMult * sustain, now + attack + decay);
    gain.gain.setValueAtTime(volumeMult * sustain, now + duration - release);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.getCategoryGain(category));
    osc.start(now);
    osc.stop(now + duration);
  }

  private playNoise(duration: number, category: SoundCategory = 'sfx', volume = 0.3) {
    const ctx = this.ensureCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Bandpass filter for different noise colors
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 0.5;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.getCategoryGain(category));
    source.start(now);
    source.stop(now + duration);
  }

  private playChirp(startFreq: number, endFreq: number, duration: number, type: OscillatorType = 'sine', category: SoundCategory = 'sfx', vol = 0.5) {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.getCategoryGain(category));
    osc.start(now);
    osc.stop(now + duration);
  }

  /* ═══════════════════════════════════════════════════════════
     SOUND LIBRARY — All game sound effects
     ═══════════════════════════════════════════════════════════ */

  /* ── UI Sounds ── */
  click() {
    this.playTone(800, 0.08, 'sine', 'ui', 0.3, 0.005, 0.02, 0.3, 0.03);
  }

  hover() {
    this.playTone(600, 0.05, 'sine', 'ui', 0.15, 0.005, 0.01, 0.3, 0.02);
  }

  buttonPress() {
    this.playTone(440, 0.06, 'square', 'ui', 0.2, 0.005, 0.02, 0.4, 0.02);
    this.playTone(660, 0.06, 'square', 'ui', 0.15, 0.01, 0.02, 0.4, 0.02);
  }

  menuOpen() {
    this.playChirp(300, 800, 0.15, 'sine', 'ui', 0.25);
  }

  menuClose() {
    this.playChirp(800, 300, 0.15, 'sine', 'ui', 0.25);
  }

  /* ── Game Feedback ── */
  correct() {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;
    this.playTone(523, 0.12, 'sine', 'sfx', 0.5, 0.01, 0.03, 0.6, 0.05);
    setTimeout(() => this.playTone(659, 0.12, 'sine', 'sfx', 0.5, 0.01, 0.03, 0.6, 0.05), 80);
    setTimeout(() => this.playTone(784, 0.18, 'sine', 'sfx', 0.5, 0.01, 0.03, 0.6, 0.1), 160);
  }

  wrong() {
    this.playTone(200, 0.3, 'sawtooth', 'sfx', 0.3, 0.01, 0.05, 0.4, 0.15);
    this.playTone(180, 0.35, 'sawtooth', 'sfx', 0.2, 0.02, 0.05, 0.4, 0.15);
  }

  streak(count: number) {
    const baseFreq = 440 + (count * 40);
    this.playTone(baseFreq, 0.1, 'sine', 'sfx', 0.4);
    setTimeout(() => this.playTone(baseFreq * 1.25, 0.1, 'sine', 'sfx', 0.4), 60);
    setTimeout(() => this.playTone(baseFreq * 1.5, 0.15, 'sine', 'sfx', 0.4), 120);
  }

  combo(level: number) {
    for (let i = 0; i <= level && i < 6; i++) {
      setTimeout(() => {
        this.playTone(400 + i * 100, 0.08, 'sine', 'sfx', 0.35);
      }, i * 50);
    }
  }

  /* ── Action Sounds ── */
  shoot() {
    this.playChirp(800, 200, 0.12, 'square', 'sfx', 0.3);
    this.playNoise(0.08, 'sfx', 0.15);
  }

  laser() {
    this.playChirp(1200, 300, 0.2, 'sawtooth', 'sfx', 0.25);
  }

  explosion() {
    this.playNoise(0.5, 'sfx', 0.5);
    this.playTone(80, 0.5, 'sine', 'sfx', 0.4, 0.01, 0.1, 0.3, 0.3);
    this.playChirp(200, 40, 0.4, 'sawtooth', 'sfx', 0.3);
  }

  smallExplosion() {
    this.playNoise(0.25, 'sfx', 0.3);
    this.playTone(120, 0.25, 'sine', 'sfx', 0.3, 0.01, 0.05, 0.3, 0.15);
  }

  hit() {
    this.playNoise(0.1, 'sfx', 0.3);
    this.playTone(150, 0.1, 'square', 'sfx', 0.3, 0.005, 0.02, 0.4, 0.05);
  }

  shield() {
    this.playChirp(300, 1200, 0.3, 'sine', 'sfx', 0.3);
    this.playChirp(350, 1250, 0.35, 'sine', 'sfx', 0.15);
  }

  /* ── Collectibles ── */
  coin() {
    this.playTone(988, 0.08, 'square', 'sfx', 0.3, 0.005, 0.02, 0.5, 0.03);
    setTimeout(() => this.playTone(1319, 0.12, 'square', 'sfx', 0.3, 0.005, 0.02, 0.5, 0.05), 60);
  }

  powerUp() {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(400 + i * 150, 0.1, 'sine', 'sfx', 0.35, 0.005, 0.02, 0.5, 0.04);
      }, i * 40);
    }
  }

  extraLife() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sine', 'sfx', 0.4, 0.01, 0.03, 0.6, 0.06), i * 100);
    });
  }

  /* ── Game State ── */
  levelUp() {
    const notes = [523, 659, 784, 880, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'sine', 'sfx', 0.5, 0.01, 0.03, 0.7, 0.05);
        this.playTone(freq * 0.5, 0.15, 'sine', 'sfx', 0.2, 0.01, 0.03, 0.7, 0.05);
      }, i * 80);
    });
  }

  gameOver() {
    const notes = [392, 349, 330, 262];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'sine', 'sfx', 0.4, 0.01, 0.05, 0.5, 0.15);
      }, i * 200);
    });
  }

  victory() {
    const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sine', 'sfx', 0.45, 0.01, 0.04, 0.6, 0.08);
        this.playTone(freq * 0.75, 0.2, 'sine', 'sfx', 0.2, 0.01, 0.04, 0.6, 0.08);
      }, i * 70);
    });
  }

  countdown() {
    this.playTone(440, 0.15, 'sine', 'sfx', 0.5, 0.005, 0.03, 0.5, 0.05);
  }

  countdownGo() {
    this.playTone(880, 0.3, 'sine', 'sfx', 0.6, 0.005, 0.05, 0.6, 0.15);
    this.playTone(1320, 0.3, 'sine', 'sfx', 0.3, 0.01, 0.05, 0.6, 0.15);
  }

  /* ── Specific Game Sounds ── */
  pop() {
    this.playChirp(600, 1200, 0.08, 'sine', 'sfx', 0.35);
    this.playNoise(0.05, 'sfx', 0.1);
  }

  balloonPop() {
    this.playNoise(0.12, 'sfx', 0.3);
    this.playChirp(800, 2000, 0.08, 'sine', 'sfx', 0.3);
  }

  jump() {
    this.playChirp(200, 600, 0.15, 'sine', 'sfx', 0.3);
  }

  doubleJump() {
    this.playChirp(300, 900, 0.12, 'sine', 'sfx', 0.35);
  }

  land() {
    this.playNoise(0.06, 'sfx', 0.2);
    this.playTone(100, 0.08, 'sine', 'sfx', 0.25);
  }

  slide() {
    this.playNoise(0.15, 'sfx', 0.15);
    this.playChirp(300, 150, 0.15, 'sawtooth', 'sfx', 0.1);
  }

  slash() {
    this.playChirp(1000, 400, 0.1, 'sawtooth', 'sfx', 0.3);
    this.playNoise(0.08, 'sfx', 0.2);
  }

  whack() {
    this.playNoise(0.1, 'sfx', 0.4);
    this.playTone(200, 0.12, 'square', 'sfx', 0.35, 0.005, 0.03, 0.4, 0.06);
  }

  cardFlip() {
    this.playTone(800, 0.06, 'sine', 'ui', 0.2, 0.005, 0.02, 0.4, 0.02);
  }

  cardMatch() {
    this.playTone(660, 0.1, 'sine', 'sfx', 0.35);
    setTimeout(() => this.playTone(880, 0.15, 'sine', 'sfx', 0.35), 80);
  }

  towerPlace() {
    this.playTone(440, 0.1, 'square', 'sfx', 0.3, 0.005, 0.03, 0.4, 0.04);
    this.playTone(550, 0.1, 'square', 'sfx', 0.2, 0.01, 0.03, 0.4, 0.04);
  }

  waveStart() {
    this.playChirp(200, 400, 0.3, 'sawtooth', 'sfx', 0.3);
    setTimeout(() => this.playChirp(200, 400, 0.3, 'sawtooth', 'sfx', 0.2), 200);
  }

  typing() {
    const freq = 600 + Math.random() * 400;
    this.playTone(freq, 0.03, 'square', 'ui', 0.1, 0.002, 0.01, 0.3, 0.01);
  }

  lineComplete() {
    this.playChirp(400, 800, 0.15, 'square', 'sfx', 0.3);
    this.playChirp(500, 900, 0.15, 'square', 'sfx', 0.2);
  }

  tetris() {
    const notes = [659, 784, 880, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.12, 'square', 'sfx', 0.35), i * 60);
    });
  }

  bombExplosion() {
    this.playNoise(0.6, 'sfx', 0.5);
    this.playTone(60, 0.6, 'sine', 'sfx', 0.5, 0.01, 0.1, 0.4, 0.35);
    this.playChirp(300, 30, 0.5, 'sawtooth', 'sfx', 0.35);
  }

  tick() {
    this.playTone(1000, 0.03, 'sine', 'ui', 0.2, 0.002, 0.01, 0.4, 0.01);
  }

  alarm() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone(880, 0.15, 'square', 'sfx', 0.4);
        this.playTone(660, 0.15, 'square', 'sfx', 0.2);
      }, i * 200);
    }
  }

  /* ── Ambient / Music ── */
  startAmbient(type: 'space' | 'forest' | 'ocean' | 'city') {
    const ctx = this.ensureCtx();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.getCategoryGain('ambient'));

    // Create gentle ambient pad
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();

    const freqs: Record<string, [number, number]> = {
      space: [65, 98],
      forest: [110, 165],
      ocean: [82, 123],
      city: [73, 110],
    };
    const [f1, f2] = freqs[type] || freqs.space;

    osc1.type = 'sine';
    osc1.frequency.value = f1;
    osc2.type = 'sine';
    osc2.frequency.value = f2;

    // LFO for gentle pulsing
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 0.1;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    osc1.connect(gain);
    osc2.connect(gain);
    lfo.start();
    osc1.start();
    osc2.start();

    // Fade in
    gain.gain.setTargetAtTime(0.15, ctx.currentTime, 2);

    const id = `ambient_${type}`;
    this.activeSounds.push({ source: osc1, gain, id });
    this.activeSounds.push({ source: osc2, gain, id: `${id}_2` });

    return id;
  }

  stopAmbient(id: string) {
    const ctx = this.ensureCtx();
    const sounds = this.activeSounds.filter(s => s.id.startsWith(id));
    sounds.forEach(s => {
      s.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      setTimeout(() => {
        try { s.source.stop(); } catch {}
      }, 2000);
    });
    this.activeSounds = this.activeSounds.filter(s => !s.id.startsWith(id));
  }

  stopAll() {
    this.activeSounds.forEach(s => {
      try { s.source.stop(); } catch {}
    });
    this.activeSounds = [];
  }

  /* ── Intro Sequence Sounds ── */
  introWhoosh() {
    this.playChirp(100, 800, 0.4, 'sawtooth', 'sfx', 0.2);
    this.playNoise(0.3, 'sfx', 0.15);
  }

  introImpact() {
    this.playNoise(0.3, 'sfx', 0.4);
    this.playTone(60, 0.4, 'sine', 'sfx', 0.5, 0.005, 0.05, 0.3, 0.25);
  }

  introChime() {
    const notes = [784, 988, 1175, 1568];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, 'sine', 'sfx', 0.3, 0.01, 0.05, 0.5, 0.25);
        this.playTone(freq * 0.5, 0.4, 'sine', 'sfx', 0.15, 0.01, 0.05, 0.5, 0.25);
      }, i * 120);
    });
  }

  introRiser() {
    this.playChirp(100, 2000, 2, 'sawtooth', 'sfx', 0.15);
    this.playChirp(150, 2500, 2.2, 'sine', 'sfx', 0.1);
  }
}

// Singleton instance
const soundEngine = new SoundEngineClass();

// Legacy compatibility — the old playSound function
export function playSound(id: string): void {
  try {
    switch (id) {
      case 'click': soundEngine.click(); break;
      case 'correct': soundEngine.correct(); break;
      case 'wrong': soundEngine.wrong(); break;
      case 'shoot': soundEngine.shoot(); break;
      case 'explosion': soundEngine.explosion(); break;
      case 'smallExplosion': case 'small_explosion': soundEngine.smallExplosion(); break;
      case 'coin': soundEngine.coin(); break;
      case 'powerup': soundEngine.powerUp(); break;
      case 'levelup': soundEngine.levelUp(); break;
      case 'gameover': soundEngine.gameOver(); break;
      case 'victory': soundEngine.victory(); break;
      case 'pop': soundEngine.pop(); break;
      case 'jump': soundEngine.jump(); break;
      case 'hit': soundEngine.hit(); break;
      case 'countdown': soundEngine.countdown(); break;
      case 'go': soundEngine.countdownGo(); break;
      case 'card_flip': soundEngine.cardFlip(); break;
      case 'card_match': soundEngine.cardMatch(); break;
      case 'streak': soundEngine.streak(3); break;
      case 'combo': soundEngine.combo(3); break;
      case 'whoosh': soundEngine.introWhoosh(); break;
      case 'land': soundEngine.land(); break;
      case 'slide': soundEngine.slide(); break;
      case 'slash': soundEngine.slash(); break;
      case 'whack': soundEngine.whack(); break;
      case 'balloon_pop': soundEngine.balloonPop(); break;
      case 'tower_place': case 'place': soundEngine.towerPlace(); break;
      case 'wave_start': case 'wave': soundEngine.waveStart(); break;
      case 'wave_clear': soundEngine.coin(); break;
      case 'kill': soundEngine.smallExplosion(); break;
      case 'leak': soundEngine.wrong(); break;
      case 'typing': soundEngine.typing(); break;
      case 'line_complete': soundEngine.lineComplete(); break;
      case 'tetris': soundEngine.tetris(); break;
      case 'bomb': soundEngine.bombExplosion(); break;
      case 'tick': soundEngine.tick(); break;
      case 'alarm': soundEngine.alarm(); break;
      case 'extra_life': soundEngine.extraLife(); break;
      case 'shield': soundEngine.shield(); break;
      case 'laser': soundEngine.laser(); break;
      case 'double_jump': soundEngine.doubleJump(); break;
      default: soundEngine.click(); break;
    }
  } catch {
    // Silently fail if audio context isn't available
  }
}

export { soundEngine };
export default soundEngine;
