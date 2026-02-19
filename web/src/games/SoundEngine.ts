/* ═══════════════════════════════════════════════════════════
   SKILLZSTORM SOUND ENGINE
   All-synthesized audio: music, SFX, themes — no external files
   Uses Web Audio API oscillators and noise generators
   ═══════════════════════════════════════════════════════════ */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicOscs: OscillatorNode[] = [];
let musicPlaying = false;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.15;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(masterGain);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ── Simple tone helper ──
function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.3, delay = 0) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, c.currentTime + delay);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(sfxGain!);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration + 0.05);
}

// ── PUBLIC SFX ──────────────────────────────────────────
export function sfxCorrect() {
  playTone(523, 0.1, 'square', 0.25);
  playTone(659, 0.1, 'square', 0.25, 0.08);
  playTone(784, 0.15, 'square', 0.3, 0.16);
}

export function sfxWrong() {
  playTone(200, 0.15, 'sawtooth', 0.2);
  playTone(150, 0.2, 'sawtooth', 0.25, 0.1);
}

export function sfxShoot() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(sfxGain!);
  osc.start();
  osc.stop(c.currentTime + 0.2);
}

export function sfxJump() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.12);
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(sfxGain!);
  osc.start();
  osc.stop(c.currentTime + 0.2);
}

export function sfxCoin() {
  playTone(988, 0.08, 'square', 0.15);
  playTone(1319, 0.12, 'square', 0.2, 0.08);
}

export function sfxExplosion() {
  const c = getCtx();
  const bufferSize = c.sampleRate * 0.3;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.3, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain!);
  source.start();
}

export function sfxPop() {
  playTone(600, 0.06, 'sine', 0.2);
  playTone(900, 0.04, 'sine', 0.15, 0.03);
}

export function sfxLevelUp() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => playTone(n, 0.15, 'square', 0.2, i * 0.1));
}

export function sfxGameOver() {
  const notes = [400, 350, 300, 200];
  notes.forEach((n, i) => playTone(n, 0.25, 'sawtooth', 0.15, i * 0.2));
}

export function sfxClick() {
  playTone(800, 0.04, 'square', 0.1);
}

export function sfxFlip() {
  playTone(440, 0.08, 'triangle', 0.12);
  playTone(550, 0.06, 'triangle', 0.1, 0.04);
}

export function sfxMatch() {
  playTone(660, 0.1, 'square', 0.2);
  playTone(880, 0.1, 'square', 0.2, 0.1);
  playTone(1100, 0.15, 'square', 0.25, 0.2);
}

export function sfxStreak() {
  playTone(784, 0.08, 'square', 0.15);
  playTone(988, 0.08, 'square', 0.15, 0.06);
  playTone(1175, 0.08, 'square', 0.15, 0.12);
  playTone(1568, 0.15, 'square', 0.2, 0.18);
}

// ── BACKGROUND MUSIC ────────────────────────────────────
// Simple chiptune loop — like Mario/retro game waiting music
const melodyNotes = [
  523, 523, 0, 523, 0, 392, 523, 0,
  659, 0, 0, 0, 330, 0, 0, 0,
  392, 0, 0, 330, 0, 0, 262, 0,
  0, 330, 0, 440, 0, 494, 466, 440,
];

const bassNotes = [
  131, 131, 0, 131, 0, 131, 131, 0,
  165, 0, 0, 0, 131, 0, 0, 0,
  131, 0, 0, 110, 0, 0, 131, 0,
  0, 110, 0, 147, 0, 165, 156, 147,
];

let musicTimeout: ReturnType<typeof setTimeout> | null = null;
let currentBeat = 0;

function playBeat() {
  if (!musicPlaying) return;
  const c = getCtx();

  const note = melodyNotes[currentBeat % melodyNotes.length];
  const bass = bassNotes[currentBeat % bassNotes.length];

  if (note > 0) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.value = note;
    gain.gain.setValueAtTime(0.08, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(musicGain!);
    osc.start();
    osc.stop(c.currentTime + 0.15);
  }

  if (bass > 0) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = bass;
    gain.gain.setValueAtTime(0.06, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(musicGain!);
    osc.start();
    osc.stop(c.currentTime + 0.18);
  }

  currentBeat++;
  musicTimeout = setTimeout(playBeat, 160); // ~375 BPM / 8th notes at ~94 BPM
}

export function startMusic() {
  if (musicPlaying) return;
  getCtx();
  musicPlaying = true;
  currentBeat = 0;
  playBeat();
}

export function stopMusic() {
  musicPlaying = false;
  if (musicTimeout) clearTimeout(musicTimeout);
  musicOscs.forEach(o => { try { o.stop(); } catch (_) {} });
  musicOscs = [];
}

export function toggleMusic(): boolean {
  if (musicPlaying) { stopMusic(); return false; }
  startMusic();
  return true;
}

// ── Volume controls ──
export function setMasterVolume(v: number) { if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v)); }
export function setSfxVolume(v: number) { if (sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, v)); }
export function setMusicVolume(v: number) { if (musicGain) musicGain.gain.value = Math.max(0, Math.min(1, v)); }

// Auto-initialize on first user interaction
export function initAudio() {
  getCtx();
}
