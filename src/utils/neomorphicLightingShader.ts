/**
 * src/utils/neomorphicLightingShader.ts
 * 60fps Dynamic Neomorphic Shadow Cast & Interactive Lighting Shaders Protocol
 * Telegram Dark Mode tactile surfaces with real-time directional light raycasting.
 * Dual-vector specular highlight and ambient shadow projection, 60fps easing, and zero memory leaks.
 */

export interface NeomorphicConfig {
  elevation: number;        // Surface elevation height (2 to 20px)
  lightIntensity: number;   // Specular intensity factor (0.0 to 1.0)
  shadowBlur: number;       // Base blur radius (4 to 30px)
  highlightColor: string;   // Light source specular RGB
  shadowColor: string;      // Deep ambient shadow RGB
  smoothing: number;        // Cursor interpolation factor (0.05 to 0.2)
}

export class NeomorphicLightingShader {
  private config: NeomorphicConfig;
  private lightX: number = 0.3; // Normalized light source (0 to 1)
  private lightY: number = 0.2;
  private currentOffsetX: number = -4;
  private currentOffsetY: number = -4;
  private targetOffsetX: number = -4;
  private targetOffsetY: number = -4;
  private animId: number | null = null;
  private isRunning: boolean = false;
  private boundElements: Set<HTMLElement> = new Set();

  constructor(config: Partial<NeomorphicConfig> = {}) {
    this.config = {
      elevation: 6,
      lightIntensity: 0.12,
      shadowBlur: 14,
      highlightColor: '255, 255, 255',
      shadowColor: '0, 0, 0',
      smoothing: 0.1,
      ...config,
    };
  }

  public setLightSource(normX: number, normY: number): void {
    this.lightX = Math.max(0, Math.min(1, normX));
    this.lightY = Math.max(0, Math.min(1, normY));

    // Vector from center (0.5, 0.5) to light position
    const dx = 0.5 - this.lightX;
    const dy = 0.5 - this.lightY;
    this.targetOffsetX = dx * this.config.elevation * 2;
    this.targetOffsetY = dy * this.config.elevation * 2;

    if (!this.isRunning) {
      this.start();
    }
  }

  public attachElement(el: HTMLElement): void {
    this.boundElements.add(el);
    this.applyShadowToElement(el);
  }

  public detachElement(el: HTMLElement): void {
    this.boundElements.delete(el);
    el.style.boxShadow = '';
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

    // Smooth easing towards target offset
    this.currentOffsetX += (this.targetOffsetX - this.currentOffsetX) * this.config.smoothing;
    this.currentOffsetY += (this.targetOffsetY - this.currentOffsetY) * this.config.smoothing;

    this.boundElements.forEach((el) => {
      this.applyShadowToElement(el);
    });

    const diff = Math.abs(this.targetOffsetX - this.currentOffsetX) + Math.abs(this.targetOffsetY - this.currentOffsetY);
    if (diff < 0.05) {
      this.currentOffsetX = this.targetOffsetX;
      this.currentOffsetY = this.targetOffsetY;
      this.stop();
      return;
    }

    this.animId = requestAnimationFrame(this.renderLoop);
  };

  public getComputedBoxShadow(): string {
    const ox = this.currentOffsetX.toFixed(2);
    const oy = this.currentOffsetY.toFixed(2);
    const revOx = (-this.currentOffsetX).toFixed(2);
    const revOy = (-this.currentOffsetY).toFixed(2);
    const blur = this.config.shadowBlur;

    // Dual-vector: Specular highlight on light side, deep ambient shadow on opposite side
    const highlight = `${ox}px ${oy}px ${blur}px rgba(${this.config.highlightColor}, ${this.config.lightIntensity})`;
    const shadow = `${revOx}px ${revOy}px ${blur * 1.3}px rgba(${this.config.shadowColor}, 0.45)`;

    return `${highlight}, ${shadow}`;
  }

  private applyShadowToElement(el: HTMLElement): void {
    el.style.boxShadow = this.getComputedBoxShadow();
  }

  public destroy(): void {
    this.stop();
    this.boundElements.forEach((el) => {
      el.style.boxShadow = '';
    });
    this.boundElements.clear();
  }
}
