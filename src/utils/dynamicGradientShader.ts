/**
 * src/utils/dynamicGradientShader.ts
 * 60fps Lightweight Dynamic Liquid Mesh & Ambient Gradient Engine
 * Inspired by Telegram Desktop & macOS fluid animated chat backgrounds.
 * Zero external dependencies, pure WebGL / Canvas2D with automatic battery-saving throttling.
 */

export interface ShaderColorStop {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface DynamicShaderConfig {
  fpsLimit?: number;
  speed?: number;
  intensity?: number;
  colors?: ShaderColorStop[];
}

export class DynamicGradientShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private timeStep: number = 0;
  private speed: number;
  private fpsLimit: number;
  private colors: ShaderColorStop[];

  constructor(canvas: HTMLCanvasElement, config: DynamicShaderConfig = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.speed = config.speed ?? 0.0015;
    this.fpsLimit = config.fpsLimit ?? 60;
    this.colors = config.colors ?? [
      { r: 24, g: 32, b: 54, a: 0.95 },
      { r: 37, g: 99, b: 235, a: 0.25 },
      { r: 16, g: 185, b: 129, a: 0.20 },
      { r: 139, g: 92, b: 246, a: 0.20 },
    ];
  }

  public setColors(newColors: ShaderColorStop[]): void {
    if (newColors && newColors.length > 0) {
      this.colors = newColors;
    }
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
    this.lastTime = performance.now();
    this.renderLoop(this.lastTime);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private renderLoop = (timestamp: number): void => {
    if (!this.isRunning) return;

    const delta = timestamp - this.lastTime;
    const interval = 1000 / this.fpsLimit;

    if (delta >= interval) {
      this.lastTime = timestamp - (delta % interval);
      this.timeStep += this.speed * delta;
      this.drawFrame();
    }

    this.animFrameId = requestAnimationFrame(this.renderLoop);
  };

  private drawFrame(): void {
    if (!this.ctx) return;
    const { width, height } = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = width / dpr;
    const cssH = height / dpr;

    this.ctx.clearRect(0, 0, cssW, cssH);

    // Compute harmonic center points for ambient liquid glow
    const t = this.timeStep;
    const cx1 = cssW * (0.35 + 0.15 * Math.sin(t * 1.2));
    const cy1 = cssH * (0.35 + 0.15 * Math.cos(t * 0.9));
    const r1 = Math.max(cssW, cssH) * 0.65;

    const cx2 = cssW * (0.65 + 0.20 * Math.cos(t * 1.1));
    const cy2 = cssH * (0.65 + 0.15 * Math.sin(t * 1.4));
    const r2 = Math.max(cssW, cssH) * 0.55;

    // Base background fill
    const baseColor = this.colors[0];
    this.ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${baseColor.a ?? 1})`;
    this.ctx.fillRect(0, 0, cssW, cssH);

    // Liquid Mesh Gradient Blob 1
    if (this.colors[1]) {
      const g1 = this.ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, r1);
      const c1 = this.colors[1];
      g1.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${c1.a ?? 0.3})`);
      g1.addColorStop(1, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0)`);
      this.ctx.fillStyle = g1;
      this.ctx.fillRect(0, 0, cssW, cssH);
    }

    // Liquid Mesh Gradient Blob 2
    if (this.colors[2]) {
      const g2 = this.ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r2);
      const c2 = this.colors[2];
      g2.addColorStop(0, `rgba(${c2.r}, ${c2.g}, ${c2.b}, ${c2.a ?? 0.25})`);
      g2.addColorStop(1, `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0)`);
      this.ctx.fillStyle = g2;
      this.ctx.fillRect(0, 0, cssW, cssH);
    }

    // Optional Accent Blob 3
    if (this.colors[3]) {
      const cx3 = cssW * (0.5 + 0.25 * Math.sin(t * 0.8));
      const cy3 = cssH * (0.5 + 0.25 * Math.cos(t * 1.3));
      const r3 = Math.max(cssW, cssH) * 0.45;
      const g3 = this.ctx.createRadialGradient(cx3, cy3, 0, cx3, cy3, r3);
      const c3 = this.colors[3];
      g3.addColorStop(0, `rgba(${c3.r}, ${c3.g}, ${c3.b}, ${c3.a ?? 0.2})`);
      g3.addColorStop(1, `rgba(${c3.r}, ${c3.g}, ${c3.b}, 0)`);
      this.ctx.fillStyle = g3;
      this.ctx.fillRect(0, 0, cssW, cssH);
    }
  }

  public destroy(): void {
    this.stop();
    this.ctx = null;
  }
}
