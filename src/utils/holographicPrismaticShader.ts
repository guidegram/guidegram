/**
 * src/utils/holographicPrismaticShader.ts
 * 60fps Dynamic Holographic Prismatic Foil & Iridescent Shimmer Protocol
 * Telegram Premium / Star badge style angle-of-incidence rainbow refraction.
 * Mathematical spectral phase shifting, specular foil sheen, and zero memory leaks.
 */

export interface HolographicConfig {
  intensity: number;      // Foil reflection intensity (0.0 to 1.0)
  spectrumSpeed: number;  // Phase shift speed
  sheenWidth: number;     // Width of bright specular highlight band
  interactive: boolean;   // React to cursor / tilt position
}

export class HolographicPrismaticShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: HolographicConfig;
  private currentAngle: number = 45; // Degrees
  private targetAngle: number = 45;
  private cursorX: number = 0.5;
  private cursorY: number = 0.5;
  private phaseOffset: number = 0;
  private animId: number | null = null;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<HolographicConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.config = {
      intensity: 0.65,
      spectrumSpeed: 0.02,
      sheenWidth: 0.35,
      interactive: true,
      ...config,
    };
  }

  public setCursorPosition(normX: number, normY: number): void {
    this.cursorX = Math.max(0, Math.min(1, normX));
    this.cursorY = Math.max(0, Math.min(1, normY));
    
    // Calculate reflection angle from center (0.5, 0.5)
    const dx = this.cursorX - 0.5;
    const dy = this.cursorY - 0.5;
    this.targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

    if (!this.isRunning) {
      this.start();
    }
  }

  public setIntensity(intensity: number): void {
    this.config.intensity = Math.max(0, Math.min(1, intensity));
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

    // Smooth angle interpolation
    this.currentAngle += (this.targetAngle - this.currentAngle) * 0.1;
    this.phaseOffset = (this.phaseOffset + this.config.spectrumSpeed) % 1;

    this.ctx.clearRect(0, 0, w, h);

    // Compute linear gradient vector along current angle
    const rad = (this.currentAngle * Math.PI) / 180;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const length = Math.sqrt(w * w + h * h) * 0.5;
    const x0 = cx - Math.cos(rad) * length;
    const y0 = cy - Math.sin(rad) * length;
    const x1 = cx + Math.cos(rad) * length;
    const y1 = cy + Math.sin(rad) * length;

    const grad = this.ctx.createLinearGradient(x0, y0, x1, y1);

    // Multi-stop iridescent spectrum
    const stops = 7;
    for (let i = 0; i <= stops; i++) {
      const stopPos = i / stops;
      const hue = Math.floor(((stopPos + this.phaseOffset) % 1) * 360);
      const alpha = this.config.intensity * (0.35 + 0.3 * Math.sin(stopPos * Math.PI * 2));
      grad.addColorStop(stopPos, `hsla(${hue}, 88%, 68%, ${alpha.toFixed(2)})`);
    }

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);

    // Specular silver-white sheen beam
    const sheenGrad = this.ctx.createLinearGradient(x0, y0, x1, y1);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    sheenGrad.addColorStop(0.48, 'rgba(255, 255, 255, 0.05)');
    sheenGrad.addColorStop(0.5, `rgba(255, 255, 255, ${Math.min(0.7, this.config.intensity * 0.9)})`);
    sheenGrad.addColorStop(0.52, 'rgba(255, 255, 255, 0.05)');
    sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = sheenGrad;
    this.ctx.fillRect(0, 0, w, h);
  }

  public destroy(): void {
    this.stop();
    this.ctx = null;
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
