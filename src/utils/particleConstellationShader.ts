/**
 * Guidegram Master Hardening - Phase 144
 * Particle Nebula Constellation & Interactive Physics Swarm Protocol
 * 
 * Hardware-accelerated particle constellation and interactive physics swarm engine.
 * Renders celestial nodes, dynamic distance-based connective filaments, and elastic
 * pointer-repulsion force fields. Provides cinematic backdrops for Telegram login,
 * onboarding, and lock screens.
 */

export interface ParticleNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
}

export interface ConstellationConfig {
  particleCount: number;
  maxDistance: number;
  pointerRepelRadius: number;
  pointerRepelForce: number;
  particleColor: string;
  lineColor: string;
}

export class ParticleConstellationShader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: ParticleNode[] = [];
  private config: ConstellationConfig;
  private pointerX: number = -1000;
  private pointerY: number = -1000;
  private isDestroyed: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<ConstellationConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = {
      particleCount: 65,
      maxDistance: 110,
      pointerRepelRadius: 130,
      pointerRepelForce: 3.5,
      particleColor: 'rgba(56, 189, 248, 0.85)',
      lineColor: 'rgba(56, 189, 248, 0.25)',
      ...config,
    };

    this.initParticles();
  }

  private initParticles(): void {
    const w = this.canvas.width || 800;
    const h = this.canvas.height || 600;
    this.particles = [];

    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: 1.5 + Math.random() * 2.0,
        baseAlpha: 0.3 + Math.random() * 0.6,
      });
    }
  }

  /**
   * Updates pointer position in screen pixel space.
   */
  public setPointer(x: number, y: number): void {
    this.pointerX = x;
    this.pointerY = y;
  }

  /**
   * Resets pointer outside view when pointer leaves canvas.
   */
  public clearPointer(): void {
    this.pointerX = -1000;
    this.pointerY = -1000;
  }

  /**
   * Updates total particle count and reinitializes pool.
   */
  public setParticleCount(count: number): void {
    this.config.particleCount = Math.max(10, Math.min(250, count));
    this.initParticles();
  }

  /**
   * Main simulation and render pass.
   */
  public render(): void {
    if (this.isDestroyed || !this.ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return;

    this.ctx.clearRect(0, 0, w, h);

    const len = this.particles.length;

    // 1. Physics update & boundary elasticity
    for (let i = 0; i < len; i++) {
      const p = this.particles[i];

      // Interactive pointer repulsion physics
      const dx = p.x - this.pointerX;
      const dy = p.y - this.pointerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.config.pointerRepelRadius && dist > 0) {
        const force = (1 - dist / this.config.pointerRepelRadius) * this.config.pointerRepelForce;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      // Velocity damping
      p.vx *= 0.985;
      p.vy *= 0.985;

      p.x += p.vx;
      p.y += p.vy;

      // Screen boundary bounce
      if (p.x < 0) {
        p.x = 0;
        p.vx *= -1;
      } else if (p.x > w) {
        p.x = w;
        p.vx *= -1;
      }
      if (p.y < 0) {
        p.y = 0;
        p.vy *= -1;
      } else if (p.y > h) {
        p.y = h;
        p.vy *= -1;
      }
    }

    // 2. Draw connective distance filaments
    this.ctx.lineWidth = 1;
    for (let i = 0; i < len; i++) {
      const p1 = this.particles[i];
      for (let j = i + 1; j < len; j++) {
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.config.maxDistance) {
          const alpha = (1 - dist / this.config.maxDistance) * 0.45;
          this.ctx.strokeStyle = `rgba(56, 189, 248, ${alpha.toFixed(3)})`;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }

    // 3. Draw particle celestial nodes
    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      this.ctx.fillStyle = `rgba(56, 189, 248, ${p.baseAlpha.toFixed(2)})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Returns current active particle pool.
   */
  public getParticles(): ParticleNode[] {
    return [...this.particles];
  }

  /**
   * Releases memory and resources.
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.particles = [];
    this.ctx = null;
  }
}
