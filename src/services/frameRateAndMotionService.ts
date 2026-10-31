/**
 * Guidegram Frame-Rate & Motion Optimization Service
 *
 * Hardened against competitor issues:
 * - tdesktop #1272: UI lag and dropped UI interactions from layout thrashing.
 * - tdesktop #31544 & #341: Animation toggle / disable sending text animation & respects prefers-reduced-motion.
 * - tdesktop #31543: Crash out-of-bounds in text-appear animation tick (SIGABRT vector assertion).
 * - tdesktop #6312: High-resolution / high-refresh rate frame pacing and delta time clamping.
 */

export interface FramePacingMetrics {
  currentFps: number;
  droppedFrames: number;
  averageDeltaMs: number;
}

export class FramePacingAndHighRefreshRateClock {
  private lastTimestamp: number = 0;
  private frameCount: number = 0;
  private droppedCount: number = 0;
  private maxStepDeltaMs: number = 33.3; // Cap to 30fps minimum step to prevent physics blowup
  private targetFps: number = 60;

  constructor(targetFps: number = 60) {
    this.targetFps = targetFps;
  }

  public tick(timestamp: number): { deltaMs: number; isStepSafe: boolean } {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
      return { deltaMs: 16.6, isStepSafe: true };
    }

    const rawDelta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    this.frameCount++;

    const expectedDelta = 1000 / this.targetFps;
    if (rawDelta > expectedDelta * 1.8) {
      this.droppedCount++;
    }

    // Clamp delta to prevent animation jumping after long background pause
    const clampedDelta = Math.min(rawDelta, this.maxStepDeltaMs);

    return {
      deltaMs: clampedDelta,
      isStepSafe: rawDelta <= this.maxStepDeltaMs,
    };
  }

  public getMetrics(): FramePacingMetrics {
    return {
      currentFps: this.frameCount > 0 ? this.targetFps : 0,
      droppedFrames: this.droppedCount,
      averageDeltaMs: 1000 / this.targetFps,
    };
  }

  public reset(): void {
    this.lastTimestamp = 0;
    this.frameCount = 0;
    this.droppedCount = 0;
  }
}

export class SafeTextAnimationRenderer {
  /**
   * Safely calculates text character/line appearance bounds, strictly preventing
   * tdesktop #31543 crash: std::vector<Ui::Text::LineLayoutInfo> out-of-bounds SIGABRT.
   */
  public static computeSafeLineReveal(
    lineLayouts: Array<{ width: number; height: number; charCount: number }>,
    currentLineIndex: number,
    progress: number
  ): { visibleChars: number; lineWidth: number; isComplete: boolean } {
    if (!Array.isArray(lineLayouts) || lineLayouts.length === 0) {
      return { visibleChars: 0, lineWidth: 0, isComplete: true };
    }

    // Strict boundary clamping [0, length - 1]
    const clampedIndex = Math.max(0, Math.min(currentLineIndex, lineLayouts.length - 1));
    const line = lineLayouts[clampedIndex];

    const clampedProgress = Math.max(0, Math.min(progress, 1));
    const visibleChars = Math.round(line.charCount * clampedProgress);
    const lineWidth = line.width * clampedProgress;

    const isComplete = clampedIndex === lineLayouts.length - 1 && clampedProgress >= 1;

    return {
      visibleChars,
      lineWidth,
      isComplete,
    };
  }
}

export class ReducedMotionAndAnimationEnforcer {
  private userAnimationsEnabled: boolean = true;
  private systemPrefersReduced: boolean = false;

  constructor(initialUserSetting: boolean = true, systemPrefersReduced: boolean = false) {
    this.userAnimationsEnabled = initialUserSetting;
    this.systemPrefersReduced = systemPrefersReduced;
  }

  public setAnimationsEnabled(enabled: boolean): void {
    this.userAnimationsEnabled = enabled;
  }

  public setSystemReducedMotion(prefersReduced: boolean): void {
    this.systemPrefersReduced = prefersReduced;
  }

  public shouldAnimate(): boolean {
    if (this.systemPrefersReduced) {
      return false; // WCAG strict override
    }
    return this.userAnimationsEnabled;
  }

  /**
   * Returns safe transition duration in ms (0ms if disabled or reduced motion)
   */
  public getEffectiveDuration(standardDurationMs: number): number {
    return this.shouldAnimate() ? standardDurationMs : 0;
  }
}

export type DOMReadTask<T> = () => T;
export type DOMWriteTask = () => void;

export class LayoutThrashingMitigator {
  private readQueue: Array<DOMReadTask<any>> = [];
  private writeQueue: Array<DOMWriteTask> = [];
  private isFlushing: boolean = false;

  public scheduleRead<T>(task: DOMReadTask<T>): void {
    this.readQueue.push(task);
  }

  public scheduleWrite(task: DOMWriteTask): void {
    this.writeQueue.push(task);
  }

  /**
   * Flushes reads in batch first, followed by writes in batch (#1272)
   */
  public flushSync(): { readsExecuted: number; writesExecuted: number } {
    if (this.isFlushing) {
      return { readsExecuted: 0, writesExecuted: 0 };
    }
    this.isFlushing = true;

    let readCount = 0;
    let writeCount = 0;

    try {
      // 1. Execute all reads
      while (this.readQueue.length > 0) {
        const readTask = this.readQueue.shift();
        if (readTask) {
          readTask();
          readCount++;
        }
      }

      // 2. Execute all writes
      while (this.writeQueue.length > 0) {
        const writeTask = this.writeQueue.shift();
        if (writeTask) {
          writeTask();
          writeCount++;
        }
      }
    } finally {
      this.isFlushing = false;
    }

    return {
      readsExecuted: readCount,
      writesExecuted: writeCount,
    };
  }

  public clear(): void {
    this.readQueue = [];
    this.writeQueue = [];
  }
}
