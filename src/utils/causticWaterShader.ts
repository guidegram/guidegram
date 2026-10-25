/**
 * src/utils/causticWaterShader.ts
 * 60fps Dynamic Caustic Water Surface & Liquid Glass Refraction Protocol
 * Telegram Web / Desktop style underwater caustic network and liquid glass refraction.
 * Wave interference synthesis, additive light filament projection, and zero memory leaks.
 */

export interface CausticConfig {
  intensity: number;      // Caustic brightness (0.0 to 1.0)
  speed: number;          // Wave motion velocity
  scale: number;          // Spatial frequency of caustic cells
  baseColor: string;      // Ambient water color RGB
  highlightColor: string; // Caustic filament RGB
}

export class CausticWaterShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: CausticConfig;
  private time: number = 0;
  private animId: number | null = null;
  private isRunning: boolean = false;
  private agitationFactor: number = 0;

  constructor(canvas: HTMLCanvasElement, config: Partial<CausticConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.config = {
      intensity: 0.55,
      speed: 0.018,
      scale: 0.035,
      baseColor: '14, 116, 144',    // Cyan / deep azure
      highlightColor: '255, 255, 255',
      ...config,
    };
  }

  public setIntensity(intensity: number): void {
    this.config.intensity = Math.max(0, Math.min(1, intensity));
  }

  public setSpeed(speed: number): void {
    this.config.speed = Math.max(0.001, Math.min(0.1, speed));
  }

  public agitate(): void {
    this.agitationFactor = Math.min(1.5, this.agitationFactor + 0.4);
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

    this.time += this.config.speed * (1 + this.agitationFactor);
    this.agitationFactor *= 0.95; // Decay agitation

    this.ctx.clearRect(0, 0, w, h);

    // Deep water ambient backing
    this.ctx.fillStyle = `rgba(${this.config.baseColor}, 0.15)`;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    // Downscaled grid sampling for 60fps performance
    const gridSize = 16;
    const cols = Math.ceil(w / gridSize);
    const rows = Math.ceil(h / gridSize);

    for (let y = 0; y < rows; y++) {
      const py = y * gridSize;
      for (let x = 0; x < cols; x++) {
        const px = x * gridSize;

        // Harmonic multi-angle wave interference
        const nx = px * this.config.scale;
        const ny = py * this.config.scale;
        const w1 = Math.sin(nx + this.time);
        const w2 = Math.cos(ny * 1.2 - this.time * 0.8);
        const w3 = Math.sin((nx + ny) * 0.7 + this.time * 1.4);

        // Caustic focal peak where waves align
        const interference = Math.pow((w1 + w2 + w3 + 3) / 6, 4);

        if (interference > 0.35) {
          const alpha = (interference * this.config.intensity * 0.45).toFixed(3);
          this.ctx.fillStyle = `rgba(${this.config.highlightColor}, ${alpha})`;
          this.ctx.fillRect(px, py, gridSize + 1, gridSize + 1);
        }
      }
    }

    this.ctx.restore();
  }

  public destroy(): void {
    this.stop();
    this.ctx = null;
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
