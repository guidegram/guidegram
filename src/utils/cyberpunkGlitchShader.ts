/**
 * src/utils/cyberpunkGlitchShader.ts
 * 60fps Dynamic Glitch Distortion & Cyberpunk Chromatic Slice Shaders Protocol
 * Telegram Secret Chat / Cryptographic Verification glitch burst and scanline displacement.
 * Horizontal slice remapping, chromatic channel shear, auto-idle pausing, and zero memory leaks.
 */

export interface GlitchConfig {
  sliceCount: number;      // Number of displaced horizontal slices
  maxOffset: number;       // Max horizontal slice offset (pixels)
  colorSplitOffset: number; // Chromatic channel shear (pixels)
  scanlineIntensity: number; // Phosphor scanline contrast (0.0 to 1.0)
}

export class CyberpunkGlitchShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private config: GlitchConfig;
  private glitchActive: boolean = false;
  private glitchEndTime: number = 0;
  private animId: number | null = null;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<GlitchConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true });

    this.config = {
      sliceCount: 6,
      maxOffset: 14,
      colorSplitOffset: 4,
      scanlineIntensity: 0.15,
      ...config,
    };
  }

  public triggerGlitch(durationMs: number = 350): void {
    this.glitchActive = true;
    this.glitchEndTime = performance.now() + durationMs;
    if (!this.isRunning) {
      this.isRunning = true;
      this.renderLoop();
    }
  }

  public resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.max(1, Math.floor(width * dpr));
    const ph = Math.max(1, Math.floor(height * dpr));
    this.canvas.width = pw;
    this.canvas.height = ph;
    this.offscreenCanvas.width = pw;
    this.offscreenCanvas.height = ph;
  }

  private renderLoop = (): void => {
    if (!this.isRunning) return;

    if (performance.now() > this.glitchEndTime) {
      this.glitchActive = false;
      this.isRunning = false;
      this.animId = null;
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      return;
    }

    this.draw();
    this.animId = requestAnimationFrame(this.renderLoop);
  };

  public applyEffect(source: CanvasImageSource): void {
    if (!this.ctx || !this.offscreenCtx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    // Draw base source onto offscreen buffer
    this.offscreenCtx.clearRect(0, 0, w, h);
    this.offscreenCtx.drawImage(source, 0, 0, w, h);

    this.ctx.clearRect(0, 0, w, h);

    if (!this.glitchActive) {
      this.ctx.drawImage(this.offscreenCanvas, 0, 0);
      return;
    }

    // 1. Render chromatic color split
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    // Red tint left
    this.ctx.drawImage(this.offscreenCanvas, -this.config.colorSplitOffset, 0);

    // Cyan tint right
    this.ctx.drawImage(this.offscreenCanvas, this.config.colorSplitOffset, 0);
    this.ctx.restore();

    // 2. Displaced horizontal slices
    for (let i = 0; i < this.config.sliceCount; i++) {
      const sliceY = Math.floor(Math.random() * h);
      const sliceH = Math.floor(4 + Math.random() * 25);
      const offset = (Math.random() - 0.5) * this.config.maxOffset * 2;

      this.ctx.drawImage(
        this.offscreenCanvas,
        0, sliceY, w, sliceH,
        offset, sliceY, w, sliceH
      );
    }

    // 3. Scanline rasterization
    this.ctx.fillStyle = `rgba(0, 0, 0, ${this.config.scanlineIntensity})`;
    for (let y = 0; y < h; y += 4) {
      this.ctx.fillRect(0, y, w, 1);
    }
  }

  private draw(): void {
    if (!this.ctx) return;
    this.applyEffect(this.offscreenCanvas);
  }

  public destroy(): void {
    this.isRunning = false;
    this.glitchActive = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.ctx = null;
    this.offscreenCtx = null;
    this.offscreenCanvas.width = 0;
    this.offscreenCanvas.height = 0;
  }
}
