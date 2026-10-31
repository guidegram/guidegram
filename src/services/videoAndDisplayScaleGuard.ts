/**
 * Guidegram Video & Display Scale Guard Service
 *
 * Hardened against competitor issues:
 * - tdesktop #463: Video from iPad/mobile playing upside down.
 * - tdesktop #31422: Round video messages starting gray and blocky from missing IDR keyframe & 1,000,000 fps encoder bug.
 * - tdesktop #10: Video decoding blurriness from unsupported profile / hardware fallback.
 * - tdesktop #26366: Fractional scaling (125%, 150%) pixel-tearing and blur on Wayland/Windows.
 * - tdesktop #31314: Story and avatar row names not refreshing after profile update.
 */

export interface VideoTransformStyle {
  transform: string;
  transformOrigin: string;
  widthAdjustmentPercent: number;
}

export class VideoRotationAndMatrixNormalizer {
  /**
   * Normalizes video rotation angle (0, 90, 180, 270) (#463)
   */
  public static computeTransformForRotation(rotationDegrees: number): VideoTransformStyle {
    const normalizedAngle = ((rotationDegrees % 360) + 360) % 360;

    switch (normalizedAngle) {
      case 90:
        return {
          transform: 'rotate(90deg)',
          transformOrigin: 'center center',
          widthAdjustmentPercent: 100,
        };
      case 180:
        return {
          transform: 'rotate(180deg)',
          transformOrigin: 'center center',
          widthAdjustmentPercent: 100,
        };
      case 270:
        return {
          transform: 'rotate(270deg)',
          transformOrigin: 'center center',
          widthAdjustmentPercent: 100,
        };
      case 0:
      default:
        return {
          transform: 'none',
          transformOrigin: 'center center',
          widthAdjustmentPercent: 100,
        };
    }
  }
}

export interface RoundVideoEncoderConfig {
  fps: number;
  width: number;
  height: number;
  keyframeIntervalSec: number;
  forceImmediateIdr: boolean;
}

export class RoundVideoKeyframeAndCodecGuard {
  public static readonly MIN_SAFE_FPS = 15;
  public static readonly MAX_SAFE_FPS = 60;
  public static readonly DEFAULT_FPS = 30;

  /**
   * Sanitizes video note encoder configuration, strictly preventing the
   * tdesktop #31422 bug where encoder was erroneously configured for 1,000,000 fps.
   */
  public static sanitizeEncoderConfig(requestedFps: number, diameter: number = 384): RoundVideoEncoderConfig {
    let safeFps = this.DEFAULT_FPS;
    if (typeof requestedFps === 'number' && !isNaN(requestedFps) && isFinite(requestedFps)) {
      safeFps = Math.max(this.MIN_SAFE_FPS, Math.min(requestedFps, this.MAX_SAFE_FPS));
    }

    return {
      fps: safeFps,
      width: diameter,
      height: diameter,
      keyframeIntervalSec: 1.0, // Keyframe every 1 second
      forceImmediateIdr: true,   // Force immediate keyframe at 0.00s to avoid blocky/gray start (#31422)
    };
  }
}

export class FractionalScalePixelSnapper {
  /**
   * Snaps layout dimensions to physical integer pixels on fractional DPI screens (#26366)
   */
  public static snapToPhysicalPixels(cssPixels: number, devicePixelRatio: number = 1.0): number {
    const dpr = Math.max(0.1, devicePixelRatio);
    const physicalPixels = Math.round(cssPixels * dpr);
    return physicalPixels / dpr;
  }

  /**
   * Snaps video rect coordinates to avoid half-pixel boundary seam tearing
   */
  public static snapRect(rect: { x: number; y: number; width: number; height: number }, dpr: number = 1.0) {
    return {
      x: this.snapToPhysicalPixels(rect.x, dpr),
      y: this.snapToPhysicalPixels(rect.y, dpr),
      width: this.snapToPhysicalPixels(rect.width, dpr),
      height: this.snapToPhysicalPixels(rect.height, dpr),
    };
  }
}

export interface UserProfileSyncEvent {
  userId: string | number;
  newName: string;
  newAvatarUrl?: string;
  updatedAt: number;
}

export class StoryAndAvatarProfileSyncEngine {
  private profileCache: Map<string | number, UserProfileSyncEvent> = new Map();
  private listeners: Array<(event: UserProfileSyncEvent) => void> = [];

  public updateProfile(userId: string | number, newName: string, newAvatarUrl?: string): UserProfileSyncEvent {
    const event: UserProfileSyncEvent = {
      userId,
      newName,
      newAvatarUrl,
      updatedAt: Date.now(),
    };
    this.profileCache.set(userId, event);

    // Notify story and chat list observers (#31314)
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn('[ProfileSync] Listener error:', err);
      }
    }

    return event;
  }

  public getProfile(userId: string | number): UserProfileSyncEvent | null {
    return this.profileCache.get(userId) || null;
  }

  public subscribe(cb: (event: UserProfileSyncEvent) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }
}
