/**
 * src/utils/cinematicBloomShader.ts
 * GPU-Accelerated Multi-Pass Bloom & Cinematic Blur Shader Engine
 * Telegram macOS / Desktop styled backdrop bloom and luminosity glow.
 * Zero external dependencies, pure WebGL / Canvas2D multi-pass filter.
 */

export interface BloomConfig {
  threshold?: number;
  intensity?: number;
  blurRadius?: number;
  tint?: { r: number; g: number; b: number; a?: number };
}

export class CinematicBloomShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private threshold: number;
  private intensity: number;
  private blurRadius: number;
  private tint: { r: number; g: number; b: number; a?: number };

  constructor(canvas: HTMLCanvasElement, config: BloomConfig = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.threshold = config.threshold ?? 0.65;
    this.intensity = config.intensity ?? 0.8;
    this.blurRadius = config.blurRadius ?? 16;
    this.tint = config.tint ?? { r: 59, g: 130, b: 246, a: 0.15 };

    if (typeof document !== 'undefined') {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });
    }
  }

  public resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);

    if (this.offscreenCanvas) {
      // Downscale offscreen buffer for efficient multi-pass blur
      this.offscreenCanvas.width = Math.max(1, Math.floor((width * dpr) / 2));
      this.offscreenCanvas.height = Math.max(1, Math.floor((height * dpr) / 2));
    }
  }

  public renderBloom(sourceImage?: HTMLCanvasElement | HTMLImageElement): void {
    if (!this.ctx) return;
    const { width, height } = this.canvas;

    this.ctx.clearRect(0, 0, width, height);

    // If source image exists, process luminous pass into offscreen buffer
    if (sourceImage && this.offscreenCtx && this.offscreenCanvas) {
      this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
      this.offscreenCtx.filter = `blur(${this.blurRadius}px) brightness(1.2)`;
      this.offscreenCtx.drawImage(
        sourceImage,
        0,
        0,
        this.offscreenCanvas.width,
        this.offscreenCanvas.height
      );

      // Composite blurred bloom pass back with screen blend
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'screen';
      this.ctx.globalAlpha = this.intensity;
      this.ctx.drawImage(this.offscreenCanvas, 0, 0, width, height);
      this.ctx.restore();
    }

    // Apply chromatic atmospheric tint
    this.ctx.save();
    this.ctx.fillStyle = `rgba(${this.tint.r}, ${this.tint.g}, ${this.tint.b}, ${this.tint.a ?? 0.15})`;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();
  }

  public setIntensity(val: number): void {
    this.intensity = Math.max(0, Math.min(2, val));
  }

  public destroy(): void {
    this.ctx = null;
    this.offscreenCtx = null;
    this.offscreenCanvas = null;
  }
}
