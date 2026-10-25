/**
 * src/utils/auroraBorealisShader.ts
 * 60fps Dynamic Aurora Borealis Wave Shimmer & Ethereal Curtains Protocol
 * Telegram Dark Theme ambient backdrop with undulating emerald & violet light ribbons.
 * Trigonometric harmonic curtain synthesis, screen composite blending, and zero memory leaks.
 */

export interface AuroraConfig {
  intensity: number;      // Light intensity (0.0 to 1.0)
  speed: number;          // Wave motion velocity
  ribbonCount: number;    // Number of layered curtains (e.g. 3)
  baseColor: string;      // Primary emerald/cyan palette
  accentColor: string;    // Violet/indigo accent palette
}

export class AuroraBorealisShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: AuroraConfig;
  private time: number = 0;
  private animId: number | null = null;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<AuroraConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.config = {
      intensity: 0.6,
      speed: 0.015,
      ribbonCount: 3,
      baseColor: '16, 185, 129',   // Emerald
      accentColor: '139, 92, 246', // Violet
      ...config,
    };
  }

  public setIntensity(intensity: number): void {
    this.config.intensity = Math.max(0, Math.min(1, intensity));
  }

  public setSpeed(speed: number): void {
    this.config.speed = Math.max(0.001, Math.min(0.1, speed));
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

    this.time += this.config.speed;
    this.ctx.clearRect(0, 0, w, h);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    // Render multi-layered undulating curtains
    for (let r = 0; r < this.config.ribbonCount; r++) {
      const ribbonPhase = this.time + r * 1.8;
      const isAccent = r % 2 === 1;
      const rgb = isAccent ? this.config.accentColor : this.config.baseColor;
      const alpha = (this.config.intensity * (0.35 + 0.25 * Math.sin(this.time * 0.8 + r))).toFixed(3);

      this.ctx.beginPath();
      const baselineY = h * 0.45 + Math.sin(ribbonPhase * 0.5) * (h * 0.08);

      this.ctx.moveTo(0, h);

      // Compute wave crests along horizontal axis
      const step = 20;
      for (let x = 0; x <= w; x += step) {
        const nx = x / w;
        const wave1 = Math.sin(nx * 4 + ribbonPhase) * 45;
        const wave2 = Math.cos(nx * 8 - ribbonPhase * 1.2) * 25;
        const wave3 = Math.sin(nx * 12 + ribbonPhase * 0.7) * 12;
        const y = baselineY + wave1 + wave2 + wave3;
        this.ctx.lineTo(x, y);
      }

      this.ctx.lineTo(w, h);
      this.ctx.closePath();

      // Vertical ethereal fade gradient
      const grad = this.ctx.createLinearGradient(0, baselineY - 60, 0, h);
      grad.addColorStop(0, `rgba(${rgb}, ${alpha})`);
      grad.addColorStop(0.4, `rgba(${rgb}, ${(Number(alpha) * 0.65).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);

      this.ctx.fillStyle = grad;
      this.ctx.fill();
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
