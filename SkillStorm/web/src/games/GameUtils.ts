/* ═══════════════════════════════════════════════════════════════════════════════
   GAME UTILITIES — Shared Engine Functions for All Games
   Provides particle systems, screen shake, interpolation, scoring, combos,
   color helpers, easing, frame timing, performance detection, and more.
   
   All games import from this central utility module for consistent behavior.
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────── */
export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  friction: number;
}

export interface ScreenShake {
  intensity: number;
  duration: number;
  elapsed: number;
  active: boolean;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  alpha: number;
  vy: number;
  life: number;
  maxLife: number;
}

/* ─────────────────────────────────────────────
   MATH & GEOMETRY
   ───────────────────────────────────────────── */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0;
  return clamp((value - a) / (b - a), 0, 1);
}

export function remap(
  inMin: number, inMax: number,
  outMin: number, outMax: number,
  value: number,
): number {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value));
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function randomAngle(): number {
  return Math.random() * Math.PI * 2;
}

export function degToRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function radToDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

export function pointInRect(
  px: number, py: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

export function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function circlesOverlap(a: Vec2, ar: number, b: Vec2, br: number): boolean {
  return dist(a, b) < ar + br;
}

export function wrapAround(pos: number, min: number, max: number): number {
  const range = max - min;
  return ((pos - min) % range + range) % range + min;
}

/* ─────────────────────────────────────────────
   EASING FUNCTIONS
   ───────────────────────────────────────────── */
export const easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutElastic: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1,
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  easeOutBack: (t: number) => {
    const c = 1.70158;
    return 1 + (--t) * t * ((c + 1) * t + c);
  },
} as const;

/* ─────────────────────────────────────────────
   PARTICLE SYSTEM
   ───────────────────────────────────────────── */
export function createParticle(
  x: number, y: number,
  overrides?: Partial<Particle>,
): Particle {
  const angle = randomAngle();
  const speed = randomRange(1, 5);
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1,
    maxLife: 1,
    radius: randomRange(1, 4),
    color: '#ffffff',
    alpha: 1,
    decay: randomRange(0.01, 0.03),
    gravity: 0.05,
    friction: 0.99,
    ...overrides,
  };
}

export function createBurstParticles(
  x: number, y: number,
  count: number,
  options?: Partial<Particle> & { speed?: number; colors?: string[] },
): Particle[] {
  const { speed = 5, colors, ...rest } = options || {};
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + randomRange(-0.2, 0.2);
    const s = randomRange(speed * 0.5, speed * 1.5);
    particles.push(createParticle(x, y, {
      vx: Math.cos(angle) * s,
      vy: Math.sin(angle) * s,
      color: colors ? colors[i % colors.length] : rest.color,
      ...rest,
    }));
  }
  return particles;
}

export function createExplosion(x: number, y: number, count = 20, colors?: string[]): Particle[] {
  return createBurstParticles(x, y, count, {
    speed: 8,
    radius: randomRange(2, 5),
    decay: 0.02,
    gravity: 0.1,
    colors: colors || ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff8c00', '#ff1493'],
  });
}

export function createSparkle(x: number, y: number, count = 8, color = '#ffd700'): Particle[] {
  return createBurstParticles(x, y, count, {
    speed: 3,
    radius: randomRange(1, 3),
    decay: 0.03,
    gravity: 0,
    color,
  });
}

export function createConfetti(x: number, y: number, count = 30): Particle[] {
  return createBurstParticles(x, y, count, {
    speed: 10,
    radius: randomRange(3, 6),
    decay: 0.005,
    gravity: 0.15,
    friction: 0.98,
    colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c084fc', '#f472b6', '#fb923c'],
  });
}

export function updateParticles(particles: Particle[], dt = 1): Particle[] {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vx: p.vx * p.friction,
      vy: p.vy * p.friction + p.gravity * dt,
      life: p.life - p.decay * dt,
      alpha: Math.max(0, p.life),
    }))
    .filter(p => p.life > 0);
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, p.radius * p.alpha), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ─────────────────────────────────────────────
   FLOATING TEXT (Score Popups)
   ───────────────────────────────────────────── */
export function createFloatingText(
  x: number, y: number, text: string,
  color = '#ffffff', size = 16, duration = 60,
): FloatingText {
  return { x, y, text, color, size, alpha: 1, vy: -2, life: duration, maxLife: duration };
}

export function updateFloatingTexts(texts: FloatingText[]): FloatingText[] {
  return texts
    .map(t => ({
      ...t,
      y: t.y + t.vy,
      vy: t.vy * 0.98,
      life: t.life - 1,
      alpha: Math.max(0, t.life / t.maxLife),
    }))
    .filter(t => t.life > 0);
}

export function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
  ctx.save();
  for (const t of texts) {
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.size}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 6;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}

/* ─────────────────────────────────────────────
   SCREEN SHAKE
   ───────────────────────────────────────────── */
export function createScreenShake(intensity = 5, duration = 10): ScreenShake {
  return { intensity, duration, elapsed: 0, active: true };
}

export function updateScreenShake(shake: ScreenShake): ScreenShake {
  if (!shake.active) return shake;
  const elapsed = shake.elapsed + 1;
  if (elapsed >= shake.duration) {
    return { ...shake, active: false, elapsed };
  }
  return { ...shake, elapsed };
}

export function applyScreenShake(ctx: CanvasRenderingContext2D, shake: ScreenShake) {
  if (!shake.active) return;
  const progress = shake.elapsed / shake.duration;
  const dampedIntensity = shake.intensity * (1 - progress);
  const ox = (Math.random() - 0.5) * dampedIntensity * 2;
  const oy = (Math.random() - 0.5) * dampedIntensity * 2;
  ctx.translate(ox, oy);
}

/* ─────────────────────────────────────────────
   TRAIL EFFECT
   ───────────────────────────────────────────── */
export function addTrailPoint(trail: TrailPoint[], x: number, y: number, radius = 4, maxLength = 20): TrailPoint[] {
  const newTrail = [{ x, y, alpha: 1, radius }, ...trail].slice(0, maxLength);
  return newTrail.map((p, i) => ({ ...p, alpha: 1 - i / newTrail.length }));
}

export function drawTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[], color = '#ffffff') {
  ctx.save();
  for (const p of trail) {
    ctx.globalAlpha = p.alpha * 0.6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * p.alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ─────────────────────────────────────────────
   COLOR UTILITIES
   ───────────────────────────────────────────── */
export function hslToStr(h: number, s: number, l: number, a = 1): string {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgbObj(color1);
  const c2 = hexToRgbObj(color2);
  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const b = Math.round(lerp(c1.b, c2.b, t));
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgbObj(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

export function rainbow(t: number): string {
  const h = (t * 360) % 360;
  return `hsl(${h}, 80%, 60%)`;
}

export function neonGlow(ctx: CanvasRenderingContext2D, color: string, blur = 10) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

export function clearGlow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/* ─────────────────────────────────────────────
   DRAWING HELPERS
   ───────────────────────────────────────────── */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawGlowingCircle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number, color: string,
  glowRadius = 15,
) {
  ctx.save();
  const gradient = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius + glowRadius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.6, hexToRgba(color, 0.3));
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius + glowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number, height: number, cellSize: number,
  color = 'rgba(255,255,255,0.03)',
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= width; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawStarField(
  ctx: CanvasRenderingContext2D,
  stars: Vec2[],
  time: number,
  color = '#ffffff',
) {
  ctx.save();
  for (const star of stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(time * 0.002 + star.x * 0.1);
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = color;
    ctx.fillRect(star.x, star.y, 1.5, 1.5);
  }
  ctx.restore();
}

export function generateStars(width: number, height: number, count = 80): Vec2[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
  }));
}

/* ─────────────────────────────────────────────
   FRAME TIMING & PERFORMANCE
   ───────────────────────────────────────────── */
export class FrameTimer {
  private lastTime = 0;
  private _deltaTime = 0;
  private _fps = 60;
  private fpsBuffer: number[] = [];
  private targetDt = 1000 / 60;

  get deltaTime() { return this._deltaTime; }
  get normalizedDt() { return this._deltaTime / this.targetDt; }
  get fps() { return this._fps; }

  tick(timestamp: number): number {
    if (this.lastTime === 0) {
      this.lastTime = timestamp;
      this._deltaTime = this.targetDt;
      return 1;
    }
    this._deltaTime = Math.min(timestamp - this.lastTime, 100); // cap at 100ms
    this.lastTime = timestamp;

    // FPS calculation
    if (this._deltaTime > 0) {
      this.fpsBuffer.push(1000 / this._deltaTime);
      if (this.fpsBuffer.length > 30) this.fpsBuffer.shift();
      this._fps = Math.round(this.fpsBuffer.reduce((a, b) => a + b) / this.fpsBuffer.length);
    }

    return this.normalizedDt;
  }

  reset() {
    this.lastTime = 0;
    this._deltaTime = 0;
    this.fpsBuffer = [];
  }
}

export function detectPerformanceTier(): 'low' | 'mid' | 'high' {
  if (typeof window === 'undefined') return 'mid';
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  if (!gl) return 'low';

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';

  // Simple heuristic
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;

  if (isMobile && (cores <= 4 || memory <= 2)) return 'low';
  if (!isMobile && cores >= 8) return 'high';
  if (renderer.toLowerCase().includes('apple') || renderer.toLowerCase().includes('nvidia') || renderer.toLowerCase().includes('radeon')) return 'high';
  return 'mid';
}

/* ─────────────────────────────────────────────
   COMBO SYSTEM
   ───────────────────────────────────────────── */
export class ComboTracker {
  count = 0;
  timer = 0;
  maxWindow: number;
  best = 0;

  constructor(maxWindow = 120) {
    this.maxWindow = maxWindow;
  }

  hit() {
    this.count++;
    this.timer = this.maxWindow;
    if (this.count > this.best) this.best = this.count;
  }

  update() {
    if (this.timer > 0) {
      this.timer--;
      if (this.timer <= 0) {
        this.count = 0;
      }
    }
  }

  get multiplier(): number {
    if (this.count < 3) return 1;
    if (this.count < 5) return 1.5;
    if (this.count < 10) return 2;
    if (this.count < 20) return 3;
    return 5;
  }

  get label(): string {
    if (this.count < 3) return '';
    if (this.count < 5) return 'Nice!';
    if (this.count < 10) return 'Great!';
    if (this.count < 20) return 'Amazing!';
    if (this.count < 30) return 'INCREDIBLE!';
    return 'GODLIKE!';
  }
}

/* ─────────────────────────────────────────────
   SCORE FORMATTING
   ───────────────────────────────────────────── */
export function formatScore(score: number): string {
  if (score >= 1_000_000) return (score / 1_000_000).toFixed(1) + 'M';
  if (score >= 100_000) return (score / 1_000).toFixed(0) + 'K';
  if (score >= 10_000) return (score / 1_000).toFixed(1) + 'K';
  return score.toLocaleString();
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ─────────────────────────────────────────────
   STORAGE
   ───────────────────────────────────────────── */
export function saveHighScore(gameId: string, score: number): number {
  const key = `highscore_${gameId}`;
  const current = parseInt(localStorage.getItem(key) || '0', 10);
  if (score > current) {
    localStorage.setItem(key, score.toString());
    return score;
  }
  return current;
}

export function getHighScore(gameId: string): number {
  return parseInt(localStorage.getItem(`highscore_${gameId}`) || '0', 10);
}

export function saveGameStats(gameId: string, stats: Record<string, number>) {
  const key = `stats_${gameId}`;
  const existing = JSON.parse(localStorage.getItem(key) || '{}');
  localStorage.setItem(key, JSON.stringify({ ...existing, ...stats }));
}

export function getGameStats(gameId: string): Record<string, number> {
  return JSON.parse(localStorage.getItem(`stats_${gameId}`) || '{}');
}

/* ─────────────────────────────────────────────
   CAMERA SYSTEM
   ───────────────────────────────────────────── */
export class Camera {
  x = 0;
  y = 0;
  targetX = 0;
  targetY = 0;
  zoom = 1;
  targetZoom = 1;
  smoothing = 0.1;

  follow(target: Vec2) {
    this.targetX = target.x;
    this.targetY = target.y;
  }

  update() {
    this.x = lerp(this.x, this.targetX, this.smoothing);
    this.y = lerp(this.y, this.targetY, this.smoothing);
    this.zoom = lerp(this.zoom, this.targetZoom, this.smoothing);
  }

  apply(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }
}

/* ─────────────────────────────────────────────
   AUDIO HELPERS
   ───────────────────────────────────────────── */
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playTone(freq: number, duration = 0.1, type: OscillatorType = 'sine', volume = 0.1) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function playNoteSequence(notes: number[], interval = 0.08, type: OscillatorType = 'sine') {
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, type), i * interval * 1000);
  });
}

export const sfx = {
  hit: () => playTone(200, 0.1, 'square', 0.08),
  score: () => playNoteSequence([523, 659, 784], 0.08, 'sine'),
  lose: () => playNoteSequence([400, 300, 200], 0.12, 'sawtooth'),
  powerup: () => playNoteSequence([440, 554, 659, 880], 0.06, 'sine'),
  click: () => playTone(800, 0.05, 'sine', 0.05),
  explosion: () => {
    try {
      const ctx = getAudioCtx();
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {}
  },
  levelUp: () => playNoteSequence([523, 659, 784, 1047], 0.07, 'sine'),
  combo: (level: number) => {
    const baseFreq = 400 + level * 50;
    playNoteSequence([baseFreq, baseFreq * 1.25, baseFreq * 1.5], 0.05, 'sine');
  },
} as const;

/* ─────────────────────────────────────────────
   ANIMATION HELPERS
   ───────────────────────────────────────────── */
export function pulse(time: number, speed = 1, min = 0.8, max = 1): number {
  return lerp(min, max, 0.5 + 0.5 * Math.sin(time * speed));
}

export function breathe(time: number, speed = 0.003): number {
  return 0.5 + 0.5 * Math.sin(time * speed);
}

export function shake(time: number, intensity: number): Vec2 {
  return {
    x: Math.sin(time * 0.1) * intensity * (Math.random() - 0.5),
    y: Math.cos(time * 0.13) * intensity * (Math.random() - 0.5),
  };
}

/* ─────────────────────────────────────────────
   RESPONSIVE CANVAS HELPERS
   ───────────────────────────────────────────── */
export function getCanvasScale(canvas: HTMLCanvasElement): number {
  return canvas.width / canvas.clientWidth;
}

export function canvasTouchPos(canvas: HTMLCanvasElement, touch: Touch): Vec2 {
  const rect = canvas.getBoundingClientRect();
  const scale = getCanvasScale(canvas);
  return {
    x: (touch.clientX - rect.left) * scale,
    y: (touch.clientY - rect.top) * scale,
  };
}

export function canvasMousePos(canvas: HTMLCanvasElement, e: MouseEvent): Vec2 {
  const rect = canvas.getBoundingClientRect();
  const scale = getCanvasScale(canvas);
  return {
    x: (e.clientX - rect.left) * scale,
    y: (e.clientY - rect.top) * scale,
  };
}

/* ─────────────────────────────────────────────
   BACKGROUND RENDERERS
   ───────────────────────────────────────────── */
export function drawSpaceBackground(
  ctx: CanvasRenderingContext2D,
  width: number, height: number,
  time: number,
  stars: Vec2[],
) {
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(0.5, '#0d1127');
  gradient.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Stars
  drawStarField(ctx, stars, time);

  // Nebula effect
  ctx.save();
  ctx.globalAlpha = 0.05;
  const nebulaGrad = ctx.createRadialGradient(
    width * 0.3, height * 0.4, 0,
    width * 0.3, height * 0.4, width * 0.4,
  );
  nebulaGrad.addColorStop(0, 'rgba(100, 50, 200, 0.3)');
  nebulaGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = nebulaGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function drawOceanBackground(
  ctx: CanvasRenderingContext2D,
  width: number, height: number,
  time: number,
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0c4a6e');
  gradient.addColorStop(0.5, '#075985');
  gradient.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Waves
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += 5) {
      const y = height * (0.3 + layer * 0.2)
        + Math.sin(x * 0.02 + time * 0.001 + layer) * 15
        + Math.sin(x * 0.005 + time * 0.0005) * 25;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* ─────────────────────────────────────────────
   MOBILE DETECTION
   ───────────────────────────────────────────── */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 768);
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/* ─────────────────────────────────────────────
   FULLSCREEN
   ───────────────────────────────────────────── */
export function requestFullscreen(element?: HTMLElement) {
  const el = element || document.documentElement;
  try {
    if (el.requestFullscreen) el.requestFullscreen();
    else if ((el as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen)
      (el as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
  } catch {}
}

export function exitFullscreen() {
  try {
    if (document.exitFullscreen) document.exitFullscreen();
    else if ((document as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen)
      (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
  } catch {}
}

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}
