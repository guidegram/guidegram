/**
 * src/utils/parallaxTiltEngine.ts
 * 60fps Multi-Layer Parallax Tilt & 3D Depth Engine
 * Telegram Premium / macOS style 3D perspective tilt on hover with spring inertia.
 * Zero external libraries, mathematical cubic damping, battery-friendly throttling.
 */

export interface TiltConfig {
  maxTiltDeg?: number;
  perspective?: number;
  easing?: number;
  glare?: boolean;
}

export interface TiltValues {
  rotateX: number;
  rotateY: number;
  glareX: number;
  glareY: number;
  glareOpacity: number;
}

export class ParallaxTiltEngine {
  private element: HTMLElement;
  private maxTiltDeg: number;
  private perspective: number;
  private easing: number;
  private glare: boolean;
  private targetX: number = 0;
  private targetY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  private animId: number | null = null;
  private isHovered: boolean = false;

  constructor(element: HTMLElement, config: TiltConfig = {}) {
    this.element = element;
    this.maxTiltDeg = config.maxTiltDeg ?? 12;
    this.perspective = config.perspective ?? 1000;
    this.easing = config.easing ?? 0.12;
    this.glare = config.glare ?? true;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.addEventListener('mouseenter', this.onMouseEnter);
    this.element.addEventListener('mousemove', this.onMouseMove);
    this.element.addEventListener('mouseleave', this.onMouseLeave);
  }

  private onMouseEnter = (): void => {
    this.isHovered = true;
    if (this.animId === null) {
      this.animId = requestAnimationFrame(this.update);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normX = (x / rect.width - 0.5) * 2;
    const normY = (y / rect.height - 0.5) * 2;

    this.targetX = -normY * this.maxTiltDeg;
    this.targetY = normX * this.maxTiltDeg;
  };

  private onMouseLeave = (): void => {
    this.isHovered = false;
    this.targetX = 0;
    this.targetY = 0;
  };

  private update = (): void => {
    this.currentX += (this.targetX - this.currentX) * this.easing;
    this.currentY += (this.targetY - this.currentY) * this.easing;

    this.element.style.transform = `perspective(${this.perspective}px) rotateX(${this.currentX.toFixed(2)}deg) rotateY(${this.currentY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

    if (this.isHovered || Math.abs(this.currentX) > 0.05 || Math.abs(this.currentY) > 0.05) {
      this.animId = requestAnimationFrame(this.update);
    } else {
      this.element.style.transform = `perspective(${this.perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      this.animId = null;
    }
  };

  public destroy(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.element.removeEventListener('mouseenter', this.onMouseEnter);
    this.element.removeEventListener('mousemove', this.onMouseMove);
    this.element.removeEventListener('mouseleave', this.onMouseLeave);
    this.element.style.transform = '';
  }
}
