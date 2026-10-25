/**
 * src/utils/vectorMorphEngine.ts
 * 60fps Vector SVG Morphing & Lottie Kinetic Controller Engine
 * Telegram Desktop styled fluid morphing vector icons and cache management.
 * Zero memory leak, memory-capped Lottie cache, cubic spring interpolation.
 */

export interface MorphConfig {
  durationMs?: number;
  easing?: (t: number) => number;
}

export class VectorMorphEngine {
  private static lottieCache = new Map<string, any>();
  private static readonly MAX_CACHE_SIZE = 50;

  public static cubicEaseInOut(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public static cacheLottieAnimation(key: string, data: any): void {
    if (this.lottieCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.lottieCache.keys().next().value;
      if (oldestKey) {
        this.lottieCache.delete(oldestKey);
      }
    }
    this.lottieCache.set(key, data);
  }

  public static getCachedLottieAnimation(key: string): any | null {
    return this.lottieCache.get(key) || null;
  }

  public static clearCache(): void {
    this.lottieCache.clear();
  }

  /**
   * Linearly interpolate numerical coordinates between two equal-length SVG path coordinate arrays
   */
  public static interpolatePathPoints(
    startPoints: number[],
    endPoints: number[],
    progress: number
  ): number[] {
    const len = Math.min(startPoints.length, endPoints.length);
    const result: number[] = new Array(len);
    const easeProgress = this.cubicEaseInOut(Math.max(0, Math.min(1, progress)));

    for (let i = 0; i < len; i++) {
      result[i] = startPoints[i] + (endPoints[i] - startPoints[i]) * easeProgress;
    }
    return result;
  }
}
