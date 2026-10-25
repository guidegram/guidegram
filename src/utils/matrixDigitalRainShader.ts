/**
 * src/utils/matrixDigitalRainShader.ts
 * 60fps Dynamic Matrix Digital Rain & Cryptographic Glyph Stream Protocol
 * Telegram End-to-End Encryption & Security Verification terminal digital rain.
 * Fading phosphor trails, glyph mutation, 60fps Canvas2D rendering, and zero memory leaks.
 */

export interface MatrixRainConfig {
  fontSize: number;       // Glyph font size in pixels (e.g. 14)
  speed: number;          // Column fall speed
  leadColor: string;      // Bright leading character RGB
  trailColor: string;     // Fading trail phosphors RGB
  glyphs: string;         // Character set
}

export class MatrixDigitalRainShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: MatrixRainConfig;
  private drops: number[] = [];
  private animId: number | null = null;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<MatrixRainConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.config = {
      fontSize: 14,
      speed: 1,
      leadColor: '230, 255, 250',  // Phosphor white/emerald
      trailColor: '16, 185, 129',  // Vibrant emerald
      glyphs: '0123456789ABCDEF0123456789アイウエオカキクケコサシスセソタチツテト',
      ...config,
    };
    this.initDrops();
  }

  private initDrops(): void {
    const cols = Math.ceil(this.canvas.width / this.config.fontSize) || 20;
    this.drops = [];
    for (let i = 0; i < cols; i++) {
      // Random starting vertical positions
      this.drops[i] = Math.floor(Math.random() * -50);
    }
  }

  public resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(width * dpr));
    this.canvas.height = Math.max(1, Math.floor(height * dpr));
    this.initDrops();
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

    // Translucent black fade to create persistence trail
    this.ctx.fillStyle = 'rgba(11, 15, 25, 0.12)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.font = `${this.config.fontSize}px monospace`;

    for (let i = 0; i < this.drops.length; i++) {
      const charIndex = Math.floor(Math.random() * this.config.glyphs.length);
      const text = this.config.glyphs[charIndex];
      const x = i * this.config.fontSize;
      const y = this.drops[i] * this.config.fontSize;

      // Draw leading character with bright glow
      this.ctx.fillStyle = `rgb(${this.config.leadColor})`;
      this.ctx.fillText(text, x, y);

      // Reset drop to top once off-screen with random delay
      if (y > h && Math.random() > 0.975) {
        this.drops[i] = 0;
      }

      this.drops[i] += this.config.speed;
    }
  }

  public destroy(): void {
    this.stop();
    this.drops = [];
    this.ctx = null;
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
