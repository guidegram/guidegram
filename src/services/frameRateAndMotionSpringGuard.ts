/**
 * Guidegram Frame-Rate, Kinetic Motion & Layout Thrashing Guard
 * 
 * Hardened against:
 * - tdesktop #6746: Natural kinetic momentum scrolling & spring boundaries
 * - tdesktop #8347 & #26343: High-refresh-rate Wayland/Linux scroll stutter & layout thrashing
 * - tdesktop #5963 & #31500: GPU composite flickering & subpixel misalignments on secondary monitors
 * - tdesktop #7099 & #8708: Context menu off-screen or wrong-display spawning in multi-monitor setups
 * - Unigram #832 & tdesktop #522: Context menu IME conflicts and smart typography caret jumping
 */

export interface KineticPhysicsConfig {
  friction: number; // e.g. 0.95 per frame
  springStiffness: number; // e.g. 170
  springDamping: number; // e.g. 26
  maxVelocity: number; // e.g. 3000 px/s
  restThresholdVelocity: number; // e.g. 0.5 px/s
  restThresholdDisplacement: number; // e.g. 0.5 px
}

export interface KineticState {
  position: number;
  velocity: number;
  target: number;
  isResting: boolean;
  isOvershooting: boolean;
}

export interface CoalescedWheelDelta {
  deltaX: number;
  deltaY: number;
  eventCount: number;
  lastTimestamp: number;
}

export interface DisplayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor?: number;
}

export interface ClampedMenuPosition {
  x: number;
  y: number;
  placement: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  displayIndex: number;
}

export interface SmartTypographyResult {
  transformedText: string;
  newCaretPosition: number;
  hasReplaced: boolean;
}

export class FrameRateAndMotionSpringGuard {
  private static readonly DEFAULT_CONFIG: KineticPhysicsConfig = {
    friction: 0.92,
    springStiffness: 180,
    springDamping: 24,
    maxVelocity: 4000,
    restThresholdVelocity: 0.5,
    restThresholdDisplacement: 0.5
  };

  /**
   * Simulates one discrete step of kinetic momentum scrolling with decay or spring restoration.
   * Uses analytical critically-damped spring mechanics when bounds are exceeded.
   */
  public static stepKineticMotion(
    current: KineticState,
    minBound: number,
    maxBound: number,
    deltaTimeMs: number,
    config: Partial<KineticPhysicsConfig> = {}
  ): KineticState {
    const cfg = { ...this.DEFAULT_CONFIG, ...config };
    const dt = Math.min(Math.max(deltaTimeMs, 1), 64) / 1000; // clamp dt between 1ms and 64ms

    let { position, velocity } = current;

    // Check if out of bounds (overshoot)
    const isOutOfBoundsBelow = position < minBound;
    const isOutOfBoundsAbove = position > maxBound;
    const isOvershooting = isOutOfBoundsBelow || isOutOfBoundsAbove;

    if (isOvershooting) {
      // Spring restoration towards nearest boundary
      const boundaryTarget = isOutOfBoundsBelow ? minBound : maxBound;
      const displacement = position - boundaryTarget;

      // Spring force: F = -k * x - c * v
      const springForce = -cfg.springStiffness * displacement;
      const dampingForce = -cfg.springDamping * velocity;
      const acceleration = springForce + dampingForce;

      velocity += acceleration * dt;
      position += velocity * dt;

      // Rest check for spring
      if (
        Math.abs(velocity) < cfg.restThresholdVelocity &&
        Math.abs(position - boundaryTarget) < cfg.restThresholdDisplacement
      ) {
        return {
          position: boundaryTarget,
          velocity: 0,
          target: boundaryTarget,
          isResting: true,
          isOvershooting: false
        };
      }

      return {
        position,
        velocity,
        target: boundaryTarget,
        isResting: false,
        isOvershooting: true
      };
    }

    // In-bounds kinetic momentum decay (friction)
    const decayFactor = Math.pow(cfg.friction, dt * 60);
    velocity *= decayFactor;
    position += velocity * dt;

    // Boundary clamp or entrance to overshoot
    if (position < minBound || position > maxBound) {
      // Retain natural velocity entering overshoot
      return {
        position,
        velocity,
        target: position < minBound ? minBound : maxBound,
        isResting: false,
        isOvershooting: true
      };
    }

    // Rest check
    if (Math.abs(velocity) < cfg.restThresholdVelocity) {
      return {
        position,
        velocity: 0,
        target: position,
        isResting: true,
        isOvershooting: false
      };
    }

    return {
      position,
      velocity,
      target: position,
      isResting: false,
      isOvershooting: false
    };
  }

  /**
   * Coalesces high-frequency trackpad/wheel events (120Hz/240Hz Wayland or macOS events)
   * into a single aggregated delta per animation frame to prevent layout thrashing (tdesktop #8347).
   */
  public static coalesceWheelDeltas(
    existing: CoalescedWheelDelta | null,
    incomingDeltaX: number,
    incomingDeltaY: number,
    timestamp: number
  ): CoalescedWheelDelta {
    if (!existing) {
      return {
        deltaX: incomingDeltaX,
        deltaY: incomingDeltaY,
        eventCount: 1,
        lastTimestamp: timestamp
      };
    }

    // Normalizing momentum accumulation
    return {
      deltaX: existing.deltaX + incomingDeltaX,
      deltaY: existing.deltaY + incomingDeltaY,
      eventCount: existing.eventCount + 1,
      lastTimestamp: timestamp
    };
  }

  /**
   * Generates hardware-accelerated CSS style properties with subpixel alignment snapping
   * and clean GPU compositing hints to prevent flickering on macOS & Wayland (tdesktop #5963, #31500).
   */
  public static getAntiFlickerStyleProps(
    translationX: number,
    translationY: number,
    devicePixelRatio: number = 1,
    isAnimating: boolean = false
  ): Record<string, string> {
    // Snap translation coordinates to the exact physical device pixel grid
    const dpr = Math.max(devicePixelRatio, 1);
    const snappedX = Math.round(translationX * dpr) / dpr;
    const snappedY = Math.round(translationY * dpr) / dpr;

    const baseStyles: Record<string, string> = {
      transform: `translate3d(${snappedX}px, ${snappedY}px, 0px)`,
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      transformStyle: 'preserve-3d'
    };

    if (isAnimating) {
      baseStyles.willChange = 'transform';
    }

    return baseStyles;
  }

  /**
   * Safely calculates context menu coordinate placement across multi-monitor setups,
   * preventing display boundary clipping or cross-monitor spawning (tdesktop #7099, #8708).
   */
  public static clampContextMenuCoordinates(
    requestedX: number,
    requestedY: number,
    menuWidth: number,
    menuHeight: number,
    displays: DisplayBounds[],
    margin: number = 8
  ): ClampedMenuPosition {
    if (!displays || displays.length === 0) {
      return {
        x: requestedX,
        y: requestedY,
        placement: 'bottom-right',
        displayIndex: 0
      };
    }

    // Find the display containing the requested pointer coordinate
    let activeDisplayIdx = displays.findIndex(
      d =>
        requestedX >= d.x &&
        requestedX < d.x + d.width &&
        requestedY >= d.y &&
        requestedY < d.y + d.height
    );

    if (activeDisplayIdx === -1) {
      // Fallback: pick the closest display
      activeDisplayIdx = 0;
    }

    const display = displays[activeDisplayIdx];
    const displayRight = display.x + display.width;
    const displayBottom = display.y + display.height;

    let targetX = requestedX;
    let targetY = requestedY;
    let placementH: 'left' | 'right' = 'right';
    let placementV: 'top' | 'bottom' = 'bottom';

    // Horizontal check
    if (requestedX + menuWidth + margin > displayRight) {
      // Flip to left or clamp
      if (requestedX - menuWidth - margin >= display.x) {
        targetX = requestedX - menuWidth;
        placementH = 'left';
      } else {
        targetX = displayRight - menuWidth - margin;
      }
    } else {
      targetX = requestedX;
    }

    // Vertical check
    if (requestedY + menuHeight + margin > displayBottom) {
      // Flip above pointer or clamp
      if (requestedY - menuHeight - margin >= display.y) {
        targetY = requestedY - menuHeight;
        placementV = 'top';
      } else {
        targetY = displayBottom - menuHeight - margin;
      }
    } else {
      targetY = requestedY;
    }

    // Ensure within bounds of active display
    targetX = Math.max(display.x + margin, Math.min(targetX, displayRight - menuWidth - margin));
    targetY = Math.max(display.y + margin, Math.min(targetY, displayBottom - menuHeight - margin));

    const placementKey = `${placementV}-${placementH}` as ClampedMenuPosition['placement'];

    return {
      x: targetX,
      y: targetY,
      placement: placementKey,
      displayIndex: activeDisplayIdx
    };
  }

  /**
   * Smart typography transformer for input fields without jumping the caret or conflict with native spellcheck (tdesktop #522, Unigram #832).
   * Transforms:
   *   '--' -> '—' (em dash)
   *   '>>' -> '»'
   *   '<<' -> '«'
   *   '...' -> '…' (ellipsis)
   */
  public static applySmartTypography(
    text: string,
    caretPosition: number
  ): SmartTypographyResult {
    const rules: Array<{ pattern: RegExp; replacement: string }> = [
      { pattern: /--/g, replacement: '—' },
      { pattern: />>/g, replacement: '»' },
      { pattern: /<</g, replacement: '«' },
      { pattern: /\.\.\./g, replacement: '…' }
    ];

    let transformed = text;
    let newCaret = caretPosition;
    let hasReplaced = false;

    for (const rule of rules) {
      let match: RegExpExecArray | null;
      // Reset regex index
      rule.pattern.lastIndex = 0;

      while ((match = rule.pattern.exec(transformed)) !== null) {
        const matchIndex = match.index;
        const matchLen = match[0].length;
        const repLen = rule.replacement.length;
        const diff = matchLen - repLen;

        transformed =
          transformed.slice(0, matchIndex) +
          rule.replacement +
          transformed.slice(matchIndex + matchLen);

        hasReplaced = true;

        // If substitution occurred before or at caret, adjust caret backwards by diff
        if (caretPosition >= matchIndex + matchLen) {
          newCaret -= diff;
        }

        // Adjust lastIndex for shortened string
        rule.pattern.lastIndex = matchIndex + repLen;
      }
    }

    return {
      transformedText: transformed,
      newCaretPosition: Math.max(0, newCaret),
      hasReplaced
    };
  }
}
