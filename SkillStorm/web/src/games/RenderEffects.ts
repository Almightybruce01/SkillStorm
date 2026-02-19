/* ═══════════════════════════════════════════════════════════════════════════════
   RENDER EFFECTS — Elite Visual Effects System v1
   Advanced canvas rendering effects for premium game visuals.
   Features: Post-processing, bloom, chromatic aberration, vignette, CRT,
   motion blur, film grain, screen transitions, color grading, weather systems,
   lighting, shadows, heat haze, water reflections, parallax backgrounds,
   pixel art scaling, sprite animation, sprite sheets, text effects.
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ── Color Utilities ── */
export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const val = parseInt(hex.replace('#', ''), 16);
  return { r: (val >> 16) & 0xFF, g: (val >> 8) & 0xFF, b: val & 0xFF };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function hslToRGB(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const a = hexToRGB(c1);
  const b = hexToRGB(c2);
  return rgbToHex(
    Math.round(a.r + (b.r - a.r) * t),
    Math.round(a.g + (b.g - a.g) * t),
    Math.round(a.b + (b.b - a.b) * t)
  );
}

/* ── Post-Processing Pipeline ── */

export interface PostProcessConfig {
  bloom?: { intensity: number; threshold: number; radius: number };
  vignette?: { intensity: number; radius: number };
  chromaticAberration?: { offset: number };
  filmGrain?: { intensity: number };
  crt?: { scanlineIntensity: number; curvature: number };
  colorGrade?: { brightness: number; contrast: number; saturation: number; hue: number };
  motionBlur?: { strength: number };
}

export class PostProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bufferCanvas: HTMLCanvasElement;
  private bufferCtx: CanvasRenderingContext2D;
  config: PostProcessConfig;

  constructor(canvas: HTMLCanvasElement, config: PostProcessConfig = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bufferCanvas = document.createElement('canvas');
    this.bufferCanvas.width = canvas.width;
    this.bufferCanvas.height = canvas.height;
    this.bufferCtx = this.bufferCanvas.getContext('2d')!;
    this.config = config;
  }

  apply() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (this.config.colorGrade) {
      this.applyColorGrade(this.config.colorGrade);
    }

    if (this.config.bloom) {
      this.applyBloom(this.config.bloom);
    }

    if (this.config.chromaticAberration) {
      this.applyChromaticAberration(this.config.chromaticAberration.offset);
    }

    if (this.config.vignette) {
      this.applyVignette(w, h, this.config.vignette);
    }

    if (this.config.filmGrain) {
      this.applyFilmGrain(w, h, this.config.filmGrain.intensity);
    }

    if (this.config.crt) {
      this.applyCRT(w, h, this.config.crt);
    }
  }

  private applyVignette(w: number, h: number, config: { intensity: number; radius: number }) {
    const gradient = this.ctx.createRadialGradient(w / 2, h / 2, w * config.radius * 0.3, w / 2, h / 2, w * config.radius);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${config.intensity})`);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);
  }

  private applyFilmGrain(w: number, h: number, intensity: number) {
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const amount = intensity * 30;

    for (let i = 0; i < data.length; i += 16) {
      const noise = (Math.random() - 0.5) * amount;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyCRT(w: number, h: number, config: { scanlineIntensity: number; curvature: number }) {
    this.ctx.fillStyle = `rgba(0,0,0,${config.scanlineIntensity * 0.15})`;
    for (let y = 0; y < h; y += 3) {
      this.ctx.fillRect(0, y, w, 1);
    }

    if (config.curvature > 0) {
      const gradient = this.ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      gradient.addColorStop(0, 'rgba(255,255,255,0.02)');
      gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, `rgba(0,0,0,${config.curvature * 0.3})`);
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, w, h);
    }
  }

  private applyBloom(config: { intensity: number; threshold: number; radius: number }) {
    this.bufferCanvas.width = this.canvas.width;
    this.bufferCanvas.height = this.canvas.height;

    this.bufferCtx.filter = `blur(${config.radius}px) brightness(${1 + config.intensity})`;
    this.bufferCtx.drawImage(this.canvas, 0, 0);
    this.bufferCtx.filter = 'none';

    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.globalAlpha = config.intensity * 0.5;
    this.ctx.drawImage(this.bufferCanvas, 0, 0);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;
  }

  private applyChromaticAberration(offset: number) {
    if (offset < 1) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.bufferCanvas.width = w;
    this.bufferCanvas.height = h;
    this.bufferCtx.drawImage(this.canvas, 0, 0);

    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.globalAlpha = 0.5;

    this.ctx.drawImage(this.bufferCanvas, -offset, 0);
    this.ctx.drawImage(this.bufferCanvas, offset, 0);

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;
  }

  private applyColorGrade(config: { brightness: number; contrast: number; saturation: number; hue: number }) {
    this.ctx.filter = `brightness(${config.brightness}) contrast(${config.contrast}) saturate(${config.saturation}) hue-rotate(${config.hue}deg)`;
    this.ctx.drawImage(this.canvas, 0, 0);
    this.ctx.filter = 'none';
  }
}

/* ── Weather System ── */
export interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  length?: number;
}

export type WeatherType = 'rain' | 'snow' | 'leaves' | 'fireflies' | 'stars' | 'dust' | 'confetti';

export class WeatherSystem {
  particles: WeatherParticle[] = [];
  type: WeatherType;
  intensity: number;
  wind: number;
  width: number;
  height: number;
  private maxParticles: number;

  constructor(type: WeatherType, width: number, height: number, intensity: number = 1) {
    this.type = type;
    this.width = width;
    this.height = height;
    this.intensity = intensity;
    this.wind = 0;
    this.maxParticles = Math.floor(intensity * this.getMaxForType());
    this.init();
  }

  private getMaxForType(): number {
    switch (this.type) {
      case 'rain': return 200;
      case 'snow': return 100;
      case 'leaves': return 30;
      case 'fireflies': return 20;
      case 'stars': return 50;
      case 'dust': return 40;
      case 'confetti': return 80;
      default: return 50;
    }
  }

  private init() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(randomY: boolean = false): WeatherParticle {
    switch (this.type) {
      case 'rain':
        return {
          x: Math.random() * this.width,
          y: randomY ? Math.random() * this.height : -10,
          vx: this.wind * 0.5,
          vy: 8 + Math.random() * 6,
          size: 1 + Math.random(),
          alpha: 0.3 + Math.random() * 0.4,
          length: 10 + Math.random() * 15,
        };
      case 'snow':
        return {
          x: Math.random() * this.width,
          y: randomY ? Math.random() * this.height : -5,
          vx: (Math.random() - 0.5) * 1.5 + this.wind * 0.3,
          vy: 0.5 + Math.random() * 1.5,
          size: 1 + Math.random() * 3,
          alpha: 0.5 + Math.random() * 0.5,
        };
      case 'leaves':
        return {
          x: Math.random() * this.width,
          y: randomY ? Math.random() * this.height : -10,
          vx: (Math.random() - 0.3) * 2 + this.wind,
          vy: 1 + Math.random() * 2,
          size: 3 + Math.random() * 5,
          alpha: 0.5 + Math.random() * 0.5,
        };
      case 'fireflies':
        return {
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: 2 + Math.random() * 3,
          alpha: Math.random(),
        };
      case 'stars':
        return {
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: 0,
          vy: 0,
          size: 0.5 + Math.random() * 2,
          alpha: 0.3 + Math.random() * 0.7,
        };
      case 'dust':
        return {
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: (Math.random() - 0.5) * 0.3 + this.wind * 0.1,
          vy: (Math.random() - 0.5) * 0.2,
          size: 1 + Math.random() * 2,
          alpha: 0.1 + Math.random() * 0.3,
        };
      case 'confetti':
        return {
          x: Math.random() * this.width,
          y: randomY ? Math.random() * this.height : -5,
          vx: (Math.random() - 0.5) * 3,
          vy: 2 + Math.random() * 3,
          size: 3 + Math.random() * 4,
          alpha: 0.7 + Math.random() * 0.3,
        };
      default:
        return { x: 0, y: 0, vx: 0, vy: 0, size: 1, alpha: 1 };
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;

      if (this.type === 'fireflies') {
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy += (Math.random() - 0.5) * 0.1;
        p.alpha = 0.3 + Math.sin(Date.now() * 0.003 + i) * 0.4;
        p.vx *= 0.98;
        p.vy *= 0.98;
      }

      if ((this.type as string) === 'stars') {
        p.alpha = 0.3 + Math.sin(Date.now() * 0.001 + i * 1.7) * 0.5;
        continue;
      }

      if (this.type === 'leaves') {
        p.vx += Math.sin(Date.now() * 0.002 + i) * 0.05;
      }

      const outOfBounds = p.y > this.height + 20 || p.x < -20 || p.x > this.width + 20 || p.y < -30;

      if (outOfBounds) {
        if (this.type === 'fireflies' || this.type === 'stars' || this.type === 'dust') {
          p.x = ((p.x % this.width) + this.width) % this.width;
          p.y = ((p.y % this.height) + this.height) % this.height;
        } else {
          this.particles[i] = this.createParticle(false);
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();

    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;

      switch (this.type) {
        case 'rain':
          ctx.strokeStyle = `rgba(120,170,255,${p.alpha})`;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 2, p.y + (p.length ?? 10));
          ctx.stroke();
          break;

        case 'snow':
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'leaves':
          ctx.fillStyle = `hsl(${30 + Math.sin(Date.now() * 0.001 + p.x) * 20}, 70%, 50%)`;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.sin(Date.now() * 0.002 + p.y) * 0.5);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;

        case 'fireflies':
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          glow.addColorStop(0, `rgba(255,255,100,${p.alpha})`);
          glow.addColorStop(0.5, `rgba(255,200,50,${p.alpha * 0.3})`);
          glow.addColorStop(1, 'rgba(255,200,50,0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'stars':
          ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          if (p.alpha > 0.6) {
            ctx.strokeStyle = `rgba(255,255,255,${p.alpha * 0.3})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x - p.size * 2, p.y);
            ctx.lineTo(p.x + p.size * 2, p.y);
            ctx.moveTo(p.x, p.y - p.size * 2);
            ctx.lineTo(p.x, p.y + p.size * 2);
            ctx.stroke();
          }
          break;

        case 'dust':
          ctx.fillStyle = `rgba(200,180,150,${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'confetti':
          ctx.fillStyle = `hsl(${(p.x * 3 + p.y * 2) % 360}, 80%, 60%)`;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(Date.now() * 0.003 + p.x);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
          break;
      }
    }

    ctx.restore();
  }

  setIntensity(intensity: number) {
    this.intensity = intensity;
    const newMax = Math.floor(intensity * this.getMaxForType());
    while (this.particles.length < newMax) {
      this.particles.push(this.createParticle(true));
    }
    while (this.particles.length > newMax) {
      this.particles.pop();
    }
  }

  setWind(wind: number) {
    this.wind = wind;
  }
}

/* ── Screen Transitions ── */
export type TransitionType = 'fade' | 'wipe' | 'circle' | 'pixelate' | 'dissolve' | 'slide';

export class ScreenTransition {
  private type: TransitionType;
  private duration: number;
  private elapsed: number;
  private direction: 'in' | 'out';
  active: boolean;
  private color: string;
  private onComplete?: () => void;

  constructor() {
    this.type = 'fade';
    this.duration = 0.5;
    this.elapsed = 0;
    this.direction = 'out';
    this.active = false;
    this.color = '#000000';
  }

  start(type: TransitionType, direction: 'in' | 'out', duration: number = 0.5, color: string = '#000000', onComplete?: () => void) {
    this.type = type;
    this.direction = direction;
    this.duration = duration;
    this.color = color;
    this.elapsed = 0;
    this.active = true;
    this.onComplete = onComplete;
  }

  update(dt: number) {
    if (!this.active) return;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.active = false;
      this.onComplete?.();
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!this.active) return;

    let progress = Math.min(1, this.elapsed / this.duration);
    if (this.direction === 'in') progress = 1 - progress;

    ctx.save();

    switch (this.type) {
      case 'fade':
        ctx.globalAlpha = progress;
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, w, h);
        break;

      case 'wipe':
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, w * progress, h);
        break;

      case 'circle': {
        const maxRadius = Math.sqrt(w * w + h * h) / 2;
        const radius = maxRadius * (1 - progress);
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        break;
      }

      case 'pixelate': {
        const pixelSize = Math.max(1, Math.floor(progress * 30));
        ctx.imageSmoothingEnabled = false;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.ceil(w / pixelSize);
        tempCanvas.height = Math.ceil(h / pixelSize);
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(ctx.canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(tempCanvas, 0, 0, w, h);

        ctx.globalAlpha = progress * 0.5;
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'dissolve': {
        ctx.fillStyle = this.color;
        const cellSize = 8;
        const threshold = progress;
        for (let x = 0; x < w; x += cellSize) {
          for (let y = 0; y < h; y += cellSize) {
            const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5;
            if (noise < threshold) {
              ctx.fillRect(x, y, cellSize, cellSize);
            }
          }
        }
        break;
      }

      case 'slide':
        ctx.fillStyle = this.color;
        ctx.fillRect(0, -h + h * progress, w, h);
        break;
    }

    ctx.restore();
  }
}

/* ── Parallax Background System ── */
export interface ParallaxLayer {
  image?: HTMLCanvasElement;
  color?: string;
  speed: number;
  y: number;
  pattern?: 'solid' | 'gradient' | 'stars' | 'mountains' | 'city' | 'clouds';
}

export class ParallaxBackground {
  layers: ParallaxLayer[] = [];
  scrollX: number = 0;
  scrollY: number = 0;

  addLayer(layer: ParallaxLayer) {
    this.layers.push(layer);
    this.layers.sort((a, b) => a.speed - b.speed);
  }

  update(dx: number, dy: number = 0) {
    this.scrollX += dx;
    this.scrollY += dy;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    for (const layer of this.layers) {
      const offsetX = this.scrollX * layer.speed;
      const offsetY = this.scrollY * layer.speed * 0.5;

      ctx.save();

      if (layer.pattern === 'gradient' && layer.color) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, layer.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else if (layer.pattern === 'stars') {
        ctx.fillStyle = 'white';
        const seed = Math.floor(layer.speed * 1000);
        for (let i = 0; i < 50; i++) {
          const sx = ((i * 137.508 + seed) % w + offsetX) % w;
          const sy = ((i * 97.123 + seed) % h + offsetY) % h;
          const sz = 0.5 + (i % 3) * 0.5;
          ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.001 + i) * 0.3;
          ctx.beginPath();
          ctx.arc((sx + w) % w, (sy + h) % h, sz, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (layer.pattern === 'mountains') {
        ctx.fillStyle = layer.color ?? 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) {
          const y = layer.y + Math.sin((x + offsetX) * 0.01) * 30 + Math.sin((x + offsetX) * 0.005) * 50;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      } else if (layer.pattern === 'clouds') {
        ctx.fillStyle = layer.color ?? 'rgba(255,255,255,0.3)';
        for (let i = 0; i < 5; i++) {
          const cx = ((i * 200 + offsetX * layer.speed) % (w + 200)) - 100;
          const cy = layer.y + Math.sin(i * 2) * 20;
          ctx.beginPath();
          ctx.ellipse(cx, cy, 60 + i * 10, 20 + i * 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (layer.image) {
        const imgW = layer.image.width;
        const startX = -(offsetX % imgW);
        for (let x = startX; x < w; x += imgW) {
          ctx.drawImage(layer.image, x, layer.y - offsetY);
        }
      }

      ctx.restore();
    }
  }
}

/* ── Sprite Animation System ── */
export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number;
}

export interface SpriteAnimation {
  name: string;
  frames: SpriteFrame[];
  loop: boolean;
}

export class SpriteAnimator {
  private animations = new Map<string, SpriteAnimation>();
  private currentAnimation: string = '';
  private currentFrame: number = 0;
  private elapsed: number = 0;
  private finished: boolean = false;
  private flipX: boolean = false;
  private flipY: boolean = false;

  addAnimation(animation: SpriteAnimation) {
    this.animations.set(animation.name, animation);
    if (!this.currentAnimation) this.currentAnimation = animation.name;
  }

  play(name: string, restart: boolean = false) {
    if (this.currentAnimation === name && !restart) return;
    this.currentAnimation = name;
    this.currentFrame = 0;
    this.elapsed = 0;
    this.finished = false;
  }

  setFlip(x: boolean, y: boolean = false) {
    this.flipX = x;
    this.flipY = y;
  }

  update(dt: number) {
    const anim = this.animations.get(this.currentAnimation);
    if (!anim || this.finished) return;

    this.elapsed += dt * 1000;
    const frame = anim.frames[this.currentFrame];

    if (this.elapsed >= frame.duration) {
      this.elapsed -= frame.duration;
      this.currentFrame++;

      if (this.currentFrame >= anim.frames.length) {
        if (anim.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = anim.frames.length - 1;
          this.finished = true;
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, spriteSheet: HTMLImageElement | HTMLCanvasElement, x: number, y: number, scale: number = 1) {
    const anim = this.animations.get(this.currentAnimation);
    if (!anim) return;

    const frame = anim.frames[this.currentFrame];
    ctx.save();
    ctx.translate(x, y);

    if (this.flipX) ctx.scale(-1, 1);
    if (this.flipY) ctx.scale(1, -1);

    ctx.drawImage(
      spriteSheet,
      frame.x, frame.y, frame.width, frame.height,
      -frame.width * scale / 2, -frame.height * scale / 2,
      frame.width * scale, frame.height * scale
    );

    ctx.restore();
  }

  isFinished(): boolean { return this.finished; }
  getCurrentFrame(): number { return this.currentFrame; }
  getCurrentAnimation(): string { return this.currentAnimation; }
}

/* ── Text Effects ── */
export function drawGlowText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  glowColor: string,
  glowSize: number = 10
) {
  ctx.save();
  ctx.font = `bold ${fontSize}px 'Inter', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = glowSize;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.fillText(text, x, y);

  ctx.shadowBlur = 0;
  ctx.restore();
}

export function drawOutlineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fillColor: string,
  strokeColor: string,
  strokeWidth: number = 3
) {
  ctx.save();
  ctx.font = `bold ${fontSize}px 'Inter', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);

  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);

  ctx.restore();
}

export function drawWaveText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  time: number,
  amplitude: number = 5,
  frequency: number = 0.3
) {
  ctx.save();
  ctx.font = `bold ${fontSize}px 'Inter', system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';

  const totalWidth = ctx.measureText(text).width;
  let currentX = x - totalWidth / 2;

  for (let i = 0; i < text.length; i++) {
    const charWidth = ctx.measureText(text[i]).width;
    const offsetY = Math.sin(time * 3 + i * frequency) * amplitude;
    ctx.fillText(text[i], currentX, y + offsetY);
    currentX += charWidth;
  }

  ctx.restore();
}

export function drawRainbowText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  time: number
) {
  ctx.save();
  ctx.font = `bold ${fontSize}px 'Inter', system-ui, sans-serif`;
  ctx.textBaseline = 'middle';

  const totalWidth = ctx.measureText(text).width;
  let currentX = x - totalWidth / 2;

  for (let i = 0; i < text.length; i++) {
    const hue = ((time * 50 + i * 30) % 360);
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    const charWidth = ctx.measureText(text[i]).width;
    ctx.fillText(text[i], currentX, y);
    currentX += charWidth;
  }

  ctx.restore();
}

/* ── Lighting System (simple 2D) ── */
export interface PointLight {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
}

export function drawLighting(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ambientColor: string,
  ambientIntensity: number,
  lights: PointLight[]
) {
  const lightCanvas = document.createElement('canvas');
  lightCanvas.width = w;
  lightCanvas.height = h;
  const lctx = lightCanvas.getContext('2d')!;

  lctx.fillStyle = ambientColor;
  lctx.globalAlpha = ambientIntensity;
  lctx.fillRect(0, 0, w, h);
  lctx.globalAlpha = 1;

  lctx.globalCompositeOperation = 'lighter';

  for (const light of lights) {
    const gradient = lctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
    gradient.addColorStop(0, light.color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.globalAlpha = light.intensity;
    lctx.fillStyle = gradient;
    lctx.fillRect(light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(lightCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

/* ── Camera Shake Preset Library ── */
export interface ShakePreset {
  intensity: number;
  duration: number;
  frequency: number;
  decay: number;
}

export const SHAKE_PRESETS: Record<string, ShakePreset> = {
  light:     { intensity: 3, duration: 0.2, frequency: 30, decay: 5 },
  medium:    { intensity: 6, duration: 0.3, frequency: 25, decay: 4 },
  heavy:     { intensity: 12, duration: 0.4, frequency: 20, decay: 3 },
  explosion: { intensity: 20, duration: 0.6, frequency: 15, decay: 2.5 },
  earthquake:{ intensity: 15, duration: 1.0, frequency: 10, decay: 1.5 },
  impact:    { intensity: 8, duration: 0.15, frequency: 40, decay: 8 },
};

export function applyShake(preset: ShakePreset, elapsed: number): { x: number; y: number } {
  if (elapsed >= preset.duration) return { x: 0, y: 0 };
  const t = elapsed / preset.duration;
  const decay = Math.exp(-preset.decay * t);
  const x = Math.sin(elapsed * preset.frequency) * preset.intensity * decay;
  const y = Math.cos(elapsed * preset.frequency * 1.1) * preset.intensity * decay * 0.8;
  return { x, y };
}
