/**
 * src/utils/fluidRippleShader.ts
 * 60fps Fluid Ripple & Tactile Shockwave Visualizer Engine
 * Telegram iOS / Desktop style interactive click & tap fluid shockwaves.
 * Zero external libraries, mathematical wavefront damping, automatic idle pausing.
 */

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

export class FluidRippleShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private ripples: Ripple[] = [];
  private animId: number | null = null;
  private isRunning: boolean = false;
  private color: string;

  constructor(canvas: HTMLCanvasElement, color: string = '59, 130, 246') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.color = color;
  }

  public triggerRipple(x: number, y: number, maxRadius: number = 80, speed: number = 3.5): void {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius,
      alpha: 0.55,
      speed,
    });

    if (!this.isRunning) {
      this.isRunning = true;
      this.renderLoop();
    }
  }

  public resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  private renderLoop = (): void => {
    if (!this.isRunning) return;

    this.draw();

    if (this.ripples.length > 0) {
      this.animId = requestAnimationFrame(this.renderLoop);
    } else {
      // Auto-pause loop when no ripples are active (battery friendly)
      this.isRunning = false;
      this.animId = null;
    }
  };

  private draw(): void {
    if (!this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    this.ctx.clearRect(0, 0, w, h);

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += r.speed;
      r.alpha -= 0.018;

      if (r.radius >= r.maxRadius || r.alpha <= 0) {
        this.ripples.splice(i, 1);
        continue;
      }

      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(${this.color}, ${Math.max(0, r.alpha)})`;
      this.ctx.lineWidth = Math.max(1, 3 * (1 - r.radius / r.maxRadius));
      this.ctx.stroke();
    }
  }

  public destroy(): void {
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.ripples = [];
    this.ctx = null;
  }
}
