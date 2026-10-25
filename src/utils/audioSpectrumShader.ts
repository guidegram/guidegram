/**
 * src/utils/audioSpectrumShader.ts
 * 60fps Dynamic Soundwave Spectrum & Live Audio Visualizer Shaders Protocol
 * Telegram Voice Message / Audio Call style live frequency bar spectrum and circular radial visualizer.
 * Spring-damped bar decay, multi-color gradient bars, auto-idle pausing, and zero memory leaks.
 */

export interface SpectrumConfig {
  barCount: number;        // Number of frequency bands (e.g. 32 to 64)
  barWidth: number;        // Width of each frequency bar
  barGap: number;          // Gap between bars
  mode: 'linear' | 'radial'; // Layout orientation
  primaryColor: string;    // Frequency bar gradient top RGB
  secondaryColor: string;  // Frequency bar gradient bottom RGB
  smoothing: number;       // Interpolation damp factor (0.1 to 0.3)
}

export class AudioSpectrumShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: SpectrumConfig;
  private currentHeights: number[] = [];
  private targetHeights: number[] = [];
  private animId: number | null = null;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<SpectrumConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.config = {
      barCount: 36,
      barWidth: 4,
      barGap: 3,
      mode: 'linear',
      primaryColor: '59, 130, 246',   // Electric Azure
      secondaryColor: '168, 85, 247', // Purple/Violet
      smoothing: 0.22,
      ...config,
    };
    this.initHeights();
  }

  private initHeights(): void {
    this.currentHeights = new Array(this.config.barCount).fill(0);
    this.targetHeights = new Array(this.config.barCount).fill(0);
  }

  public setMode(mode: 'linear' | 'radial'): void {
    this.config.mode = mode;
  }

  public updateFrequencies(frequencies: Uint8Array | number[]): void {
    const len = Math.min(this.config.barCount, frequencies.length);
    for (let i = 0; i < len; i++) {
      // Normalize byte amplitude (0 to 255) to 0.0 to 1.0
      const amp = typeof frequencies[i] === 'number' ? (frequencies[i] as number) / 255 : 0;
      this.targetHeights[i] = Math.max(0, Math.min(1, amp));
    }

    if (!this.isRunning) {
      this.isRunning = true;
      this.renderLoop();
    }
  }

  public resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(width * dpr));
    this.canvas.height = Math.max(1, Math.floor(height * dpr));
  }

  private renderLoop = (): void => {
    if (!this.isRunning) return;

    this.draw();

    // Check if active frequencies remain
    let maxDiff = 0;
    let maxVal = 0;
    for (let i = 0; i < this.config.barCount; i++) {
      maxDiff += Math.abs(this.targetHeights[i] - this.currentHeights[i]);
      maxVal += this.currentHeights[i];
    }

    if (maxDiff < 0.01 && maxVal < 0.01) {
      // Auto-idle pause when sound drops to silence
      this.isRunning = false;
      this.animId = null;
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      return;
    }

    this.animId = requestAnimationFrame(this.renderLoop);
  };

  private draw(): void {
    if (!this.ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    this.ctx.clearRect(0, 0, w, h);

    // Easing interpolation
    for (let i = 0; i < this.config.barCount; i++) {
      this.currentHeights[i] += (this.targetHeights[i] - this.currentHeights[i]) * this.config.smoothing;
      // Natural decay of target
      this.targetHeights[i] *= 0.94;
    }

    if (this.config.mode === 'linear') {
      this.drawLinear(w, h);
    } else {
      this.drawRadial(w, h);
    }
  }

  private drawLinear(w: number, h: number): void {
    if (!this.ctx) return;

    const totalWidth = this.config.barCount * (this.config.barWidth + this.config.barGap) - this.config.barGap;
    const startX = Math.max(0, (w - totalWidth) / 2);

    for (let i = 0; i < this.config.barCount; i++) {
      const bx = startX + i * (this.config.barWidth + this.config.barGap);
      const barH = Math.max(2, this.currentHeights[i] * (h * 0.85));
      const by = h - barH;

      const grad = this.ctx.createLinearGradient(bx, by, bx, h);
      grad.addColorStop(0, `rgb(${this.config.primaryColor})`);
      grad.addColorStop(1, `rgb(${this.config.secondaryColor})`);

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.roundRect(bx, by, this.config.barWidth, barH, [2, 2, 0, 0]);
      this.ctx.fill();
    }
  }

  private drawRadial(w: number, h: number): void {
    if (!this.ctx) return;

    const cx = w * 0.5;
    const cy = h * 0.5;
    const baseRadius = Math.min(w, h) * 0.28;
    const angleStep = (Math.PI * 2) / this.config.barCount;

    for (let i = 0; i < this.config.barCount; i++) {
      const angle = i * angleStep;
      const barLen = Math.max(2, this.currentHeights[i] * (Math.min(w, h) * 0.2));

      const x0 = cx + Math.cos(angle) * baseRadius;
      const y0 = cy + Math.sin(angle) * baseRadius;
      const x1 = cx + Math.cos(angle) * (baseRadius + barLen);
      const y1 = cy + Math.sin(angle) * (baseRadius + barLen);

      this.ctx.beginPath();
      this.ctx.moveTo(x0, y0);
      this.ctx.lineTo(x1, y1);
      this.ctx.strokeStyle = `rgb(${this.config.primaryColor})`;
      this.ctx.lineWidth = this.config.barWidth;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }
  }

  public destroy(): void {
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.currentHeights = [];
    this.targetHeights = [];
    this.ctx = null;
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
