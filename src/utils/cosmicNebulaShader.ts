/**
 * src/utils/cosmicNebulaShader.ts
 * 60fps Dynamic Cosmic Nebula & Deep Space Stardust Shaders Protocol
 * Telegram Dark Mode celestial backdrop with swirling nebula clouds and twinkling stardust.
 * Orbital gas cloud gradient synthesis, twinkling starfield, and zero memory leaks.
 */

export interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  blinkSpeed: number;
  phase: number;
}

export interface NebulaConfig {
  intensity: number;      // Nebula gas luminosity (0.0 to 1.0)
  starCount: number;      // Quantity of background stars
  rotationSpeed: number;  // Orbital cloud rotation velocity
  nebulaColor1: string;   // Magenta / fuchsia RGB
  nebulaColor2: string;   // Deep indigo / violet RGB
  nebulaColor3: string;   // Celestial cyan RGB
}

export class CosmicNebulaShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: NebulaConfig;
  private stars: Star[] = [];
  private time: number = 0;
  private animId: number | null = null;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<NebulaConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.config = {
      intensity: 0.65,
      starCount: 65,
      rotationSpeed: 0.003,
      nebulaColor1: '217, 70, 239', // Fuchsia
      nebulaColor2: '99, 102, 241',  // Indigo
      nebulaColor3: '6, 182, 212',   // Cyan
      ...config,
    };
    this.initStars();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < this.config.starCount; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        radius: 0.5 + Math.random() * 1.5,
        baseAlpha: 0.2 + Math.random() * 0.6,
        blinkSpeed: 0.02 + Math.random() * 0.05,
        phase: Math.random() * Math.PI * 2,
      });
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

    this.time += this.config.rotationSpeed;
    this.ctx.clearRect(0, 0, w, h);

    // Deep space dark backing
    this.ctx.fillStyle = '#0b0f19';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    // 1. Orbital swirling nebula clouds
    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxRadius = Math.max(w, h) * 0.65;

    const clouds = [
      { color: this.config.nebulaColor1, angle: this.time, dist: 0.2 },
      { color: this.config.nebulaColor2, angle: this.time * 0.8 + 2.1, dist: 0.25 },
      { color: this.config.nebulaColor3, angle: -this.time * 0.6 + 4.2, dist: 0.3 },
    ];

    clouds.forEach(({ color, angle, dist }) => {
      const gx = cx + Math.cos(angle) * (w * dist);
      const gy = cy + Math.sin(angle) * (h * dist);
      const grad = this.ctx!.createRadialGradient(gx, gy, 0, gx, gy, maxRadius);
      const alpha = (this.config.intensity * 0.35).toFixed(3);

      grad.addColorStop(0, `rgba(${color}, ${alpha})`);
      grad.addColorStop(0.5, `rgba(${color}, ${(Number(alpha) * 0.4).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${color}, 0)`);

      this.ctx!.fillStyle = grad;
      this.ctx!.fillRect(0, 0, w, h);
    });

    // 2. Twinkling stardust starfield
    this.ctx.restore();

    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const sx = s.x * w;
      const sy = s.y * h;
      const twinkle = Math.sin(this.time * 50 * s.blinkSpeed + s.phase);
      const currentAlpha = Math.max(0.1, Math.min(1, s.baseAlpha + twinkle * 0.35));

      this.ctx.beginPath();
      this.ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha.toFixed(2)})`;
      this.ctx.fill();
    }
  }

  public destroy(): void {
    this.stop();
    this.stars = [];
    this.ctx = null;
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
