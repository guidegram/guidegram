/**
 * Guidegram Master Hardening - Phase 146
 * Telegram Voice Waveform 60fps Spring FFT Visualizer Protocol
 * 
 * Hardware-accelerated 60fps audio waveform visualizer for Telegram voice messages.
 * Uses spring physics damping (Hooke's law + velocity damping) to eliminate visual audio
 * jitter, and supports dual-tone played/unplayed scrubbing thresholds.
 */

export interface WaveformBar {
  targetHeight: number;
  currentHeight: number;
  velocity: number;
}

export interface VoiceWaveformConfig {
  barsCount: number; // Telegram standard 30 to 100 waveform bars
  barWidth: number; // Bar width in px
  barGap: number; // Gap between bars in px
  minBarHeight: number;
  maxBarHeight: number;
  playedColor: string; // Color for audio already played
  unplayedColor: string; // Color for pending audio
  stiffness: number; // Spring stiffness constant
  damping: number; // Spring damping factor
}

export class VoiceWaveformVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private bars: WaveformBar[] = [];
  private config: VoiceWaveformConfig;
  private playbackProgress: number = 0.0; // 0.0 to 1.0
  private isDestroyed: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<VoiceWaveformConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = {
      barsCount: 45,
      barWidth: 2.5,
      barGap: 2.0,
      minBarHeight: 3,
      maxBarHeight: 28,
      playedColor: '#38bdf8',
      unplayedColor: 'rgba(148, 163, 184, 0.45)',
      stiffness: 0.18,
      damping: 0.75,
      ...config,
    };

    this.initBars();
  }

  private initBars(): void {
    this.bars = [];
    for (let i = 0; i < this.config.barsCount; i++) {
      this.bars.push({
        targetHeight: this.config.minBarHeight,
        currentHeight: this.config.minBarHeight,
        velocity: 0,
      });
    }
  }

  /**
   * Sets waveform amplitude peaks (e.g. 5-bit values 0-31 from MTProto or normalized 0.0-1.0).
   */
  public setWaveformData(amplitudes: number[]): void {
    const len = Math.min(this.bars.length, amplitudes.length);
    for (let i = 0; i < len; i++) {
      let norm = amplitudes[i];
      if (norm > 1.0) norm = norm / 31.0; // Auto-normalize 5-bit MTProto peak
      norm = Math.max(0, Math.min(1, norm));

      const target = this.config.minBarHeight + norm * (this.config.maxBarHeight - this.config.minBarHeight);
      this.bars[i].targetHeight = target;
    }
  }

  /**
   * Sets current playback progress ratio (0.0 to 1.0).
   */
  public setPlaybackProgress(progress: number): void {
    this.playbackProgress = Math.max(0, Math.min(1, progress));
  }

  /**
   * Main 60fps spring simulation and render step.
   */
  public render(): void {
    if (this.isDestroyed || !this.ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return;

    this.ctx.clearRect(0, 0, w, h);

    const centerY = h / 2;
    const totalBars = this.bars.length;
    const playedIndex = Math.floor(totalBars * this.playbackProgress);

    for (let i = 0; i < totalBars; i++) {
      const bar = this.bars[i];

      // Spring physics: F = -k*(x - target) - c*v
      const displacement = bar.currentHeight - bar.targetHeight;
      const springForce = -this.config.stiffness * displacement;
      const dampingForce = -this.config.damping * bar.velocity;
      const acceleration = springForce + dampingForce;

      bar.velocity += acceleration;
      bar.currentHeight += bar.velocity;

      // Ensure lower bound
      if (bar.currentHeight < this.config.minBarHeight) {
        bar.currentHeight = this.config.minBarHeight;
        bar.velocity = 0;
      }

      const x = i * (this.config.barWidth + this.config.barGap);
      const halfHeight = bar.currentHeight / 2;

      // Color split based on playback progress
      this.ctx.fillStyle = i <= playedIndex ? this.config.playedColor : this.config.unplayedColor;

      // Rounded rectangle bar
      const radius = this.config.barWidth / 2;
      const top = centerY - halfHeight;
      const height = bar.currentHeight;

      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(x, top, this.config.barWidth, height, radius);
      } else {
        this.ctx.rect(x, top, this.config.barWidth, height);
      }
      this.ctx.fill();
    }
  }

  /**
   * Returns current bars state.
   */
  public getBars(): WaveformBar[] {
    return [...this.bars];
  }

  /**
   * Cleans up canvas and releases resources.
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.bars = [];
    this.ctx = null;
  }
}
