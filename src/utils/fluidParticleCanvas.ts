/**
 * src/utils/fluidParticleCanvas.ts
 * Lightweight Shimmering Ambient Particle & Depth Engine
 * Telegram Desktop / macOS style micro-particles with cursor ambient attraction.
 * High performance, zero external libraries, battery-safe auto-pausing.
 */

export interface ParticleConfig {
  count?: number;
  maxSpeed?: number;
  baseRadius?: number;
  color?: string;
  glow?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  alphaDelta: number;
}

export class FluidParticleCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private mouseX: number = -1000;
  private mouseY: number = -1000;
  private count: number;
  private maxSpeed: number;
  private baseRadius: number;
  private color: string;

  constructor(canvas: HTMLCanvasElement, config: ParticleConfig = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.count = config.count ?? 35;
    this.maxSpeed = config.maxSpeed ?? 0.35;
    this.baseRadius = config.baseRadius ?? 1.5;
    this.color = config.color ?? '16, 185, 129';
  }

  public init(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    this.particles = [];
    for (let i = 0; i < this.count; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * this.maxSpeed,
        vy: (Math.random() - 0.5) * this.maxSpeed,
        radius: this.baseRadius * (0.6 + Math.random() * 0.8),
        alpha: 0.1 + Math.random() * 0.45,
        alphaDelta: (Math.random() - 0.5) * 0.008,
      });
    }
  }

  public resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
    this.init();
  }

  public updateMouse(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.init();
    this.renderLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private renderLoop = (): void => {
    if (!this.isRunning) return;
    this.draw();
    this.animFrameId = requestAnimationFrame(this.renderLoop);
  };

  private draw(): void {
    if (!this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    this.ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Subtle cursor attraction
      const dx = this.mouseX - p.x;
      const dy = this.mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120 && dist > 1) {
        p.vx += (dx / dist) * 0.015;
        p.vy += (dy / dist) * 0.015;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Wrap around bounds
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      // Shimmering alpha cycle
      p.alpha += p.alphaDelta;
      if (p.alpha > 0.55 || p.alpha < 0.1) {
        p.alphaDelta = -p.alphaDelta;
      }

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${this.color}, ${Math.max(0.05, Math.min(0.6, p.alpha))})`;
      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = `rgba(${this.color}, 0.5)`;
      this.ctx.fill();
    }
  }

  public destroy(): void {
    this.stop();
    this.particles = [];
    this.ctx = null;
  }
}
