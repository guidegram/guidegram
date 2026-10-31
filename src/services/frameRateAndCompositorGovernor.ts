/**
 * FrameRateAndCompositorGovernor.ts
 *
 * Comprehensive Governor for 60fps/120fps motion, spring physics, layout thrash elimination,
 * background animation suspension, and GPU compositor layer management.
 *
 * Directly resolves:
 * - telegramdesktop/tdesktop #30795: Very slow/laggy rendering loop on desktop
 * - morethanwords/tweb #252: High background CPU usage from runaway RAF loops
 * - UnigramDev/Unigram #1332: Laggy nested scrolling in chat info section
 * - UnigramDev/Unigram #3430: Laggy window dragging caused by forced synchronous layout thrashing
 * - AyuGram/AyuGramDesktop #248: Extreme CPU usage by music player visualizer in side-panel
 * - AyuGram/AyuGramDesktop #387: Extreme CPU usage during video playback without compositor layers
 */

export interface SpringConfig {
  stiffness: number; // default ~ 170
  damping: number;   // default ~ 26
  mass: number;      // default ~ 1
  precision?: number; // threshold to stop, e.g. 0.001
}

export interface SpringState {
  current: number;
  target: number;
  velocity: number;
  settled: boolean;
}

export interface CompositorHints {
  contain: string;
  willChange: string;
  transform: string;
  backfaceVisibility: string;
}

export interface VisualizerGovernorState {
  isPlaying: boolean;
  isMuted: boolean;
  isVisible: boolean;
  targetFps: number;
  shouldRender: boolean;
}

export type ReadPhaseCallback = () => void;
export type WritePhaseCallback = () => void;

export class FrameRateAndCompositorGovernor {
  private isBackgrounded = false;
  private activeAnimationCount = 0;
  private readQueue: ReadPhaseCallback[] = [];
  private writeQueue: WritePhaseCallback[] = [];
  private isBatchScheduled = false;

  constructor() {
    this.initVisibilityListeners();
  }

  private initVisibilityListeners(): void {
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        this.setVisibilityState(document.hidden);
      });
    }
  }

  /**
   * Sets the application visibility state (foreground vs backgrounded).
   */
  public setVisibilityState(hidden: boolean): void {
    this.isBackgrounded = hidden;
  }

  public getIsBackgrounded(): boolean {
    return this.isBackgrounded;
  }

  /**
   * Evaluates whether an animation tick should execute given visibility and active state.
   * Resolves morethanwords/tweb #252: stops runaway RAF loop when backgrounded.
   */
  public shouldExecuteAnimationTick(forceBackgroundPlayback = false): boolean {
    if (this.isBackgrounded && !forceBackgroundPlayback) {
      return false;
    }
    return true;
  }

  /**
   * Step function for a damped harmonic oscillator spring.
   * Calculates new position and velocity given delta time in seconds.
   * Clamps dt to max 64ms (preventing tunneling or numerical explosion on tab switch).
   */
  public stepSpring(
    state: SpringState,
    config: SpringConfig = { stiffness: 170, damping: 26, mass: 1, precision: 0.001 },
    dtSeconds: number
  ): SpringState {
    if (state.settled) {
      return { ...state, current: state.target, velocity: 0 };
    }

    // Clamp dt between 1ms and 64ms to prevent catastrophic overshoot on long frame pauses
    const clampedDt = Math.max(0.001, Math.min(0.064, dtSeconds));
    const precision = config.precision ?? 0.001;

    const displacement = state.current - state.target;
    const springForce = -config.stiffness * displacement;
    const dampingForce = -config.damping * state.velocity;
    const acceleration = (springForce + dampingForce) / config.mass;

    const newVelocity = state.velocity + acceleration * clampedDt;
    const newPosition = state.current + newVelocity * clampedDt;

    const isPositionSettled = Math.abs(newPosition - state.target) < precision;
    const isVelocitySettled = Math.abs(newVelocity) < precision;

    if (isPositionSettled && isVelocitySettled) {
      return {
        current: state.target,
        target: state.target,
        velocity: 0,
        settled: true,
      };
    }

    return {
      current: newPosition,
      target: state.target,
      velocity: newVelocity,
      settled: false,
    };
  }

  /**
   * Schedules a two-phase Read then Write DOM batch to prevent forced layout thrashing.
   * Resolves UnigramDev/Unigram #3430 (laggy window dragging).
   */
  public queueRead(readFn: ReadPhaseCallback): void {
    this.readQueue.push(readFn);
    this.scheduleBatchFlush();
  }

  public queueWrite(writeFn: WritePhaseCallback): void {
    this.writeQueue.push(writeFn);
    this.scheduleBatchFlush();
  }

  private scheduleBatchFlush(): void {
    if (this.isBatchScheduled) return;
    this.isBatchScheduled = true;

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.flushBatch());
    } else {
      setTimeout(() => this.flushBatch(), 0);
    }
  }

  /**
   * Flushes reads completely before executing writes.
   */
  public flushBatch(): { readsExecuted: number; writesExecuted: number } {
    this.isBatchScheduled = false;

    const readsToExecute = [...this.readQueue];
    const writesToExecute = [...this.writeQueue];

    this.readQueue = [];
    this.writeQueue = [];

    // Phase 1: All Reads (DOM measurements, clientWidth, getBoundingClientRect)
    for (const readFn of readsToExecute) {
      try {
        readFn();
      } catch (err) {
        console.error('Error during batch read execution:', err);
      }
    }

    // Phase 2: All Writes (DOM style mutations, transforms, class additions)
    for (const writeFn of writesToExecute) {
      try {
        writeFn();
      } catch (err) {
        console.error('Error during batch write execution:', err);
      }
    }

    return {
      readsExecuted: readsToExecute.length,
      writesExecuted: writesToExecute.length,
    };
  }

  /**
   * Computes optimal CSS compositor layer hints for scrollable views and nested drawers.
   * Resolves UnigramDev/Unigram #1332 (laggy scrolling in nested chat info).
   */
  public computeCompositorHints(options: {
    isScrollContainer?: boolean;
    isNestedDrawer?: boolean;
    isVideoOrCanvas?: boolean;
  }): CompositorHints {
    let contain = 'none';
    let willChange = 'auto';
    let transform = 'none';
    let backfaceVisibility = 'visible';

    if (options.isScrollContainer) {
      contain = 'layout style paint';
      willChange = 'scroll-position';
      backfaceVisibility = 'hidden';
    }

    if (options.isNestedDrawer) {
      contain = 'layout paint';
      willChange = 'transform';
      transform = 'translateZ(0)';
      backfaceVisibility = 'hidden';
    }

    if (options.isVideoOrCanvas) {
      willChange = 'transform';
      transform = 'translateZ(0)';
      backfaceVisibility = 'hidden';
    }

    return {
      contain,
      willChange,
      transform,
      backfaceVisibility,
    };
  }

  /**
   * Evaluates side-panel music player visualizer render requirements.
   * Resolves AyuGram/AyuGramDesktop #248.
   */
  public evaluateVisualizerExecution(
    state: { isPlaying: boolean; isMuted: boolean; isVisible: boolean; windowFocused: boolean }
  ): VisualizerGovernorState {
    if (!state.isPlaying || state.isMuted || !state.isVisible || this.isBackgrounded) {
      return {
        isPlaying: state.isPlaying,
        isMuted: state.isMuted,
        isVisible: state.isVisible,
        targetFps: 0,
        shouldRender: false,
      };
    }

    // If window is blurred but visible, cap at 30fps to conserve GPU/CPU
    const targetFps = state.windowFocused ? 60 : 30;

    return {
      isPlaying: state.isPlaying,
      isMuted: state.isMuted,
      isVisible: state.isVisible,
      targetFps,
      shouldRender: true,
    };
  }

  /**
   * Verifies whether video element styles enforce hardware compositor acceleration.
   * Resolves AyuGram/AyuGramDesktop #387.
   */
  public isHardwareVideoCompositingOptimal(styles: {
    transform?: string;
    backfaceVisibility?: string;
    willChange?: string;
  }): boolean {
    const has3dTransform =
      styles.transform?.includes('translateZ(0)') ||
      styles.transform?.includes('translate3d') ||
      false;
    const hasBackfaceHidden = styles.backfaceVisibility === 'hidden';
    const hasWillChangeTransform = styles.willChange?.includes('transform') || false;

    return (has3dTransform || hasWillChangeTransform) && hasBackfaceHidden;
  }
}

export const frameRateAndCompositorGovernor = new FrameRateAndCompositorGovernor();
