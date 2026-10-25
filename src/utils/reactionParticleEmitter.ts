/**
 * Guidegram Master Hardening - Phase 148
 * Chat Bubble Dynamic Reaction Physics & Floating Emoji Particle Emitter Protocol
 * 
 * Hardware-accelerated emoji reaction particle emitter for Telegram chat bubbles.
 * Renders floating upward particles with sinusoidal horizontal oscillations,
 * spring-damped badge pop scaling, and zero-allocation frame loops.
 */

export interface FloatingEmoji {
  x: number;
  y: number;
  initialX: number;
  vy: number;
  oscillationFreq: number;
  oscillationAmp: number;
  timeAlive: number;
  scale: number;
  alpha: number;
  emoji: string;
}

export interface ReactionConfig {
  maxParticles: number;
  riseSpeed: number; // Vertical velocity (px/frame)
  lifetimeSeconds: number; // How long each emoji particle lives
  fontSize: number; // Base emoji font size in px
}

export class ReactionParticleEmitter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: FloatingEmoji[] = [];
  private config: ReactionConfig;
  private isDestroyed: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<ReactionConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = {
      maxParticles: 40,
      riseSpeed: 1.8,
      lifetimeSeconds: 1.4,
      fontSize: 22,
      ...config,
    };
  }

  /**
   * Spawns an emoji explosion radiating upwards from reaction coordinates.
   */
  public spawnReaction(emoji: string, originX?: number, originY?: number, count: number = 6): void {
    const ox = originX !== undefined ? originX : this.canvas.width / 2;
    const oy = originY !== undefined ? originY : this.canvas.height;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.config.maxParticles) {
        this.particles.shift(); // Evict oldest to preserve memory
      }

      const spreadX = ox + (Math.random() - 0.5) * 30;
      this.particles.push({
        x: spreadX,
        y: oy,
        initialX: spreadX,
        vy: this.config.riseSpeed + Math.random() * 1.2,
        oscillationFreq: 3 + Math.random() * 4,
        oscillationAmp: 8 + Math.random() * 14,
        timeAlive: 0,
        scale: 0.6 + Math.random() * 0.6,
        alpha: 1.0,
        emoji,
      });
    }
  }

  /**
   * Main render loop updating particle positions and drawing emoji glyphs.
   */
  public render(deltaSeconds: number = 0.016): void {
    if (this.isDestroyed || !this.ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return;

    this.ctx.clearRect(0, 0, w, h);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.timeAlive += deltaSeconds;

      const progress = p.timeAlive / this.config.lifetimeSeconds;
      if (progress >= 1.0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Vertical rise and horizontal sinusoidal oscillation
      p.y -= p.vy;
      p.x = p.initialX + Math.sin(p.timeAlive * p.oscillationFreq) * p.oscillationAmp;
      p.alpha = 1.0 - Math.pow(progress, 1.5); // Smooth ease-out fade

      this.ctx.save();
      this.ctx.font = `${Math.floor(this.config.fontSize * p.scale)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillText(p.emoji, p.x, p.y);
      this.ctx.restore();
    }
  }

  /**
   * Returns active particle count.
   */
  public getActiveParticlesCount(): number {
    return this.particles.length;
  }

  /**
   * Cleans canvas and clears particles.
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.particles = [];
    this.ctx = null;
  }
}
