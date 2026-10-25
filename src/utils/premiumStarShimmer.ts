/**
 * Guidegram Master Hardening - Phase 147
 * Telegram Premium Star Shimmer & Cosmic Sparkle Burst Protocol
 * 
 * Hardware-accelerated Telegram Premium star renderer and celebration sparkle burst engine.
 * Features 3D-shaded multifaceted polygonal star rendering, dynamic specular shimmer sweeps,
 * and particle emission physics for gift transactions and profile elevation.
 */

export interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  spin: number;
  color: string;
}

export interface PremiumStarConfig {
  starRadius: number;
  primaryColor: string;
  secondaryColor: string;
  shimmerSpeed: number;
  burstParticleCount: number;
}

export class PremiumStarShimmer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private sparkles: SparkleParticle[] = [];
  private config: PremiumStarConfig;
  private shimmerTime: number = 0;
  private isDestroyed: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<PremiumStarConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = {
      starRadius: 20,
      primaryColor: '#a855f7',
      secondaryColor: '#ec4899',
      shimmerSpeed: 2.0,
      burstParticleCount: 36,
      ...config,
    };
  }

  /**
   * Triggers a burst of multi-colored sparkles radiating from origin.
   */
  public triggerBurst(originX?: number, originY?: number): void {
    const ox = originX !== undefined ? originX : this.canvas.width / 2;
    const oy = originY !== undefined ? originY : this.canvas.height / 2;
    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#38bdf8', '#fbbf24'];

    for (let i = 0; i < this.config.burstParticleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 5.0;
      this.sparkles.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        alpha: 1.0,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  /**
   * Main render step drawing multifaceted star and active sparkle physics.
   */
  public render(deltaSeconds: number = 0.016): void {
    if (this.isDestroyed || !this.ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return;

    this.ctx.clearRect(0, 0, w, h);
    this.shimmerTime += deltaSeconds * this.config.shimmerSpeed;

    const cx = w / 2;
    const cy = h / 2;
    const r = this.config.starRadius;

    // 1. Draw 3D-shaded multifaceted star
    this.drawStar(cx, cy, 5, r, r * 0.45);

    // 2. Update and draw sparkle particles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const p = this.sparkles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // Mild gravity
      p.vx *= 0.96; // Air drag
      p.vy *= 0.96;
      p.rotation += p.spin;
      p.alpha -= 0.018;

      if (p.alpha <= 0) {
        this.sparkles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.alpha);

      // Draw diamond sparkle glyph
      this.ctx.beginPath();
      this.ctx.moveTo(0, -p.size);
      this.ctx.lineTo(p.size * 0.6, 0);
      this.ctx.lineTo(0, p.size);
      this.ctx.lineTo(-p.size * 0.6, 0);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    if (!this.ctx) return;

    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    this.ctx.save();

    // Shimmer gradient
    const shimmerOffset = Math.sin(this.shimmerTime) * outerRadius;
    const grad = this.ctx.createLinearGradient(
      cx - outerRadius + shimmerOffset,
      cy - outerRadius,
      cx + outerRadius + shimmerOffset,
      cy + outerRadius
    );
    grad.addColorStop(0, this.config.primaryColor);
    grad.addColorStop(0.5, '#fbbf24'); // Golden shine
    grad.addColorStop(1, this.config.secondaryColor);

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }

    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
    this.ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
    this.ctx.shadowBlur = 12;
    this.ctx.fill();
    this.ctx.restore();
  }

  /**
   * Returns active sparkle particle count.
   */
  public getSparkleCount(): number {
    return this.sparkles.length;
  }

  /**
   * Cleans canvas and clears particles.
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.sparkles = [];
    this.ctx = null;
  }
}
