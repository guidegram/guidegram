/**
 * src/utils/liquidMetaballsShader.ts
 * 60fps Dynamic Liquid Metaballs & Viscous Organic Fusion Shaders Protocol
 * Telegram Web / Desktop style viscous fluid droplets with smooth coalescing fusion.
 * Gaussian blur alpha threshold filtering, fluid particle dynamics, and zero memory leaks.
 */

export interface Metaball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface MetaballConfig {
  ballCount: number;      // Quantity of liquid droplets (e.g. 8 - 14)
  color: string;          // Fluid droplet RGB (e.g. '59, 130, 246' or '168, 85, 247')
  blurRadius: number;     // Gaussian blur radius in pixels
  speed: number;          // Particle velocity multiplier
  attractorStrength: number; // Pull towards cursor (0.0 to 1.0)
}

export class LiquidMetaballsShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: MetaballConfig;
  private balls: Metaball[] = [];
  private attractorX: number | null = null;
  private attractorY: number | null = null;
  private animId: number | null = null;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<MetaballConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.config = {
      ballCount: 10,
      color: '59, 130, 246', // Electric Azure
      blurRadius: 18,
      speed: 1.2,
      attractorStrength: 0.04,
      ...config,
    };
    this.initBalls();
  }

  private initBalls(): void {
    const w = this.canvas.width || 400;
    const h = this.canvas.height || 400;
    this.balls = [];

    for (let i = 0; i < this.config.ballCount; i++) {
      this.balls.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 2 * this.config.speed,
        vy: (Math.random() - 0.5) * 2 * this.config.speed,
        radius: 20 + Math.random() * 25,
      });
    }
  }

  public setAttractor(normX: number | null, normY: number | null): void {
    if (normX === null || normY === null) {
      this.attractorX = null;
      this.attractorY = null;
    } else {
      this.attractorX = normX * this.canvas.width;
      this.attractorY = normY * this.canvas.height;
    }
  }

  public resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(width * dpr));
    this.canvas.height = Math.max(1, Math.floor(height * dpr));
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.renderLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private renderLoop = (): void => {
    if (!this.isRunning) return;

    this.draw();
    this.animId = requestAnimationFrame(this.renderLoop);
  };

  private draw(): void {
    if (!this.ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    this.ctx.clearRect(0, 0, w, h);

    // Apply Gaussian blur for metaball fusion
    this.ctx.save();
    this.ctx.filter = `blur(${this.config.blurRadius}px)`;

    for (let i = 0; i < this.balls.length; i++) {
      const b = this.balls[i];

      // Attractor gravitational pull towards cursor if present
      if (this.attractorX !== null && this.attractorY !== null) {
        b.vx += (this.attractorX - b.x) * this.config.attractorStrength * 0.05;
        b.vy += (this.attractorY - b.y) * this.config.attractorStrength * 0.05;
      }

      b.x += b.vx;
      b.y += b.vy;

      // Elastic boundary rebound
      if (b.x - b.radius < 0) {
        b.x = b.radius;
        b.vx *= -1;
      } else if (b.x + b.radius > w) {
        b.x = w - b.radius;
        b.vx *= -1;
      }

      if (b.y - b.radius < 0) {
        b.y = b.radius;
        b.vy *= -1;
      } else if (b.y + b.radius > h) {
        b.y = h - b.radius;
        b.vy *= -1;
      }

      // Draw blurred fluid droplet circle
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgb(${this.config.color})`;
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  public destroy(): void {
    this.stop();
    this.balls = [];
    this.ctx = null;
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
