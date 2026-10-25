/**
 * src/utils/glassmorphismShader.ts
 * Real-Time Adaptive Glassmorphism & Refraction Engine
 * Telegram macOS / Desktop modern frosted glass with automatic hardware capability detection.
 * Zero external libraries, smooth graceful degradation, light/dark theme adaptive refraction.
 */

export interface GlassConfig {
  blurRadius?: number;
  saturation?: number;
  borderOpacity?: number;
  ambientLight?: boolean;
}

export class GlassmorphismShader {
  private static supportsBackdropFilter: boolean | null = null;

  public static checkBackdropSupport(): boolean {
    if (this.supportsBackdropFilter !== null) {
      return this.supportsBackdropFilter;
    }
    if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
      this.supportsBackdropFilter =
        CSS.supports('backdrop-filter', 'blur(10px)') ||
        CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
    } else {
      this.supportsBackdropFilter = false;
    }
    return this.supportsBackdropFilter;
  }

  public static getGlassStyle(isLightMode: boolean = false, config: GlassConfig = {}): Record<string, string> {
    const blur = config.blurRadius ?? 18;
    const sat = config.saturation ?? 150;
    const borderOp = config.borderOpacity ?? (isLightMode ? 0.15 : 0.08);

    if (this.checkBackdropSupport()) {
      return {
        backdropFilter: `blur(${blur}px) saturate(${sat}%)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(${sat}%)`,
        backgroundColor: isLightMode ? 'rgba(255, 255, 255, 0.75)' : 'rgba(18, 24, 38, 0.78)',
        borderColor: isLightMode ? `rgba(0, 0, 0, ${borderOp})` : `rgba(255, 255, 255, ${borderOp})`,
      };
    }

    // Graceful fallback when backdrop-filter is disabled or unaccelerated
    return {
      backgroundColor: isLightMode ? 'rgba(245, 247, 250, 0.96)' : 'rgba(18, 24, 38, 0.96)',
      borderColor: isLightMode ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
    };
  }
}
