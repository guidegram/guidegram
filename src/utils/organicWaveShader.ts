/**
 * src/utils/organicWaveShader.ts
 * 60fps Organic Wave Morphing & Audio Reactive Visualizer Engine
 * Telegram Voice Call / Voice Recording style fluid wave contours.
 * Zero external libraries, mathematical sine wave synthesis, clean GPU/CPU footprint.
 */

export interface OrganicWaveConfig {
  waveCount?: number;
  color?: string;
  speed?: number;
  baseAmplitude?: number;
}

export class OrganicWaveShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private animId: number | null = null;
  private isRunning: boolean = false;
  private phase: number = 0;
  private waveCount: number;
  private color: string;
  private speed: number;
  private baseAmplitude: number;
  private audioAmplitude: number = 0;

  constructor(canvas: HTMLCanvasElement, config: OrganicWaveConfig = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.waveCount = config.waveCount ?? 3;
    this.color = config.color ?? '16, 185, 129';
    this.speed = config.speed ?? 0.04;
    this.baseAmplitude = config.baseAmplitude ?? 15;
  }

  public setAudioAmplitude(amp: number): void {
    // Clamped target audio frequency response [0..1]
    this.audioAmplitude = Math.max(0, Math.min(1, amp));
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
    this.phase += this.speed;
    this.draw();
    this.animId = requestAnimationFrame(this.renderLoop);
  };

  private draw(): void {
    if (!this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    this.ctx.clearRect(0, 0, w, h);

    const midY = h / 2;
    const effectiveAmp = this.baseAmplitude + this.audioAmplitude * 35;

    for (let layer = 0; layer < this.waveCount; layer++) {
      this.ctx.beginPath();
      const layerOffset = layer * (Math.PI / 3);
      const alpha = 0.2 + (layer / this.waveCount) * 0.35;

      this.ctx.moveTo(0, midY);

      for (let x = 0; x <= w; x += 4) {
        const freq = 0.008 + layer * 0.003;
        const y =
          midY +
          Math.sin(x * freq + this.phase + layerOffset) * effectiveAmp * Math.sin((x / w) * Math.PI);
        this.ctx.lineTo(x, y);
      }

      this.ctx.lineTo(w, h);
      this.ctx.lineTo(0, h);
      this.ctx.closePath();

      this.ctx.fillStyle = `rgba(${this.color}, ${alpha})`;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = `rgba(${this.color}, 0.4)`;
      this.ctx.fill();
    }
  }

  public destroy(): void {
    this.stop();
    this.ctx = null;
  }
}
