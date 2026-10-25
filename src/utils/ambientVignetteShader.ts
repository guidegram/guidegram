/**
 * src/utils/ambientVignetteShader.ts
 * 60fps Dynamic Ambient Canvas Lighting & Reactive Vignette Engine
 * Telegram macOS / Desktop eye-comfort peripheral vignette and focal lighting.
 * Zero external libraries, mathematical elliptical gradient blending, memory safe.
 */

export interface VignetteConfig {
  intensity?: number;
  focalRadius?: number;
  color?: string;
}

export class AmbientVignetteShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private intensity: number;
  private focalRadius: number;
  private color: string;
  private targetFocalX: number = 0.5;
  private targetFocalY: number = 0.5;
  private currentFocalX: number = 0.5;
  private currentFocalY: number = 0.5;
  private animId: number | null = null;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: VignetteConfig = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.intensity = config.intensity ?? 0.35;
    this.focalRadius = config.focalRadius ?? 0.75;
    this.color = config.color ?? '0, 0, 0';
  }

  public setFocalPoint(normalizedX: number, normalizedY: number): void {
    this.targetFocalX = Math.max(0, Math.min(1, normalizedX));
    this.targetFocalY = Math.max(0, Math.min(1, normalizedY));
  }

  public resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
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

    // Smooth focal interpolation
    this.currentFocalX += (this.targetFocalX - this.currentFocalX) * 0.08;
    this.currentFocalY += (this.targetFocalY - this.currentFocalY) * 0.08;

    this.draw();
    this.animId = requestAnimationFrame(this.renderLoop);
  };

  private draw(): void {
    if (!this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    this.ctx.clearRect(0, 0, w, h);

    const fx = w * this.currentFocalX;
    const fy = h * this.currentFocalY;
    const maxRadius = Math.max(w, h) * this.focalRadius;

    const grad = this.ctx.createRadialGradient(fx, fy, maxRadius * 0.25, fx, fy, maxRadius);
    grad.addColorStop(0, `rgba(${this.color}, 0)`);
    grad.addColorStop(0.65, `rgba(${this.color}, ${this.intensity * 0.4})`);
    grad.addColorStop(1, `rgba(${this.color}, ${this.intensity})`);

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }

  public destroy(): void {
    this.stop();
    this.ctx = null;
  }
}
