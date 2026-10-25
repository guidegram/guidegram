/**
 * Low-Power & Battery Saver Render Calibrator
 * 
 * Dynamically throttles rendering loops, downscales framerates (120Hz/60Hz -> 30Hz/15Hz),
 * and suspends heavy WebGL/canvas shaders when battery is depleted or low power mode is active.
 */

export type PowerMode = 'high_performance' | 'balanced' | 'saver' | 'critical';

export interface CalibrationStatus {
  targetFps: number;
  frameIntervalMs: number;
  isBatteryLow: boolean;
  isCharging: boolean;
  batteryLevel: number; // 0.0 to 1.0
  powerMode: PowerMode;
  disableHeavyShaders: boolean;
  reduceMotion: boolean;
  lastCalibrationTime: number;
}

export class BatterySaverRenderCalibrator {
  private static instance: BatterySaverRenderCalibrator | null = null;
  private status: CalibrationStatus;
  private lastRenderTimestamp = 0;
  private listeners: Set<(status: CalibrationStatus) => void> = new Set();
  private manualOverride: PowerMode | null = null;

  private constructor() {
    this.status = {
      targetFps: 60,
      frameIntervalMs: 1000 / 60,
      isBatteryLow: false,
      isCharging: true,
      batteryLevel: 1.0,
      powerMode: 'balanced',
      disableHeavyShaders: false,
      reduceMotion: false,
      lastCalibrationTime: Date.now()
    };
  }

  public static getInstance(): BatterySaverRenderCalibrator {
    if (!BatterySaverRenderCalibrator.instance) {
      BatterySaverRenderCalibrator.instance = new BatterySaverRenderCalibrator();
    }
    return BatterySaverRenderCalibrator.instance;
  }

  public calibrate(batteryLevel = 1.0, isCharging = true): CalibrationStatus {
    const clampedLevel = Math.max(0, Math.min(1, batteryLevel));
    const isBatteryLow = clampedLevel <= 0.20 && !isCharging;
    const isBatteryCritical = clampedLevel <= 0.08 && !isCharging;

    let targetFps = 60;
    let powerMode: PowerMode = 'balanced';
    let disableHeavyShaders = false;
    let reduceMotion = false;

    if (this.manualOverride) {
      powerMode = this.manualOverride;
      switch (powerMode) {
        case 'high_performance':
          targetFps = 120;
          disableHeavyShaders = false;
          reduceMotion = false;
          break;
        case 'balanced':
          targetFps = 60;
          disableHeavyShaders = false;
          reduceMotion = false;
          break;
        case 'saver':
          targetFps = 30;
          disableHeavyShaders = true;
          reduceMotion = true;
          break;
        case 'critical':
          targetFps = 15;
          disableHeavyShaders = true;
          reduceMotion = true;
          break;
      }
    } else {
      if (isCharging) {
        powerMode = 'high_performance';
        targetFps = 60;
        disableHeavyShaders = false;
        reduceMotion = false;
      } else if (isBatteryCritical) {
        powerMode = 'critical';
        targetFps = 15;
        disableHeavyShaders = true;
        reduceMotion = true;
      } else if (isBatteryLow) {
        powerMode = 'saver';
        targetFps = 30;
        disableHeavyShaders = true;
        reduceMotion = true;
      } else {
        powerMode = 'balanced';
        targetFps = 60;
        disableHeavyShaders = false;
        reduceMotion = false;
      }
    }

    this.status = {
      targetFps,
      frameIntervalMs: Number((1000 / targetFps).toFixed(2)),
      isBatteryLow,
      isCharging,
      batteryLevel: clampedLevel,
      powerMode,
      disableHeavyShaders,
      reduceMotion,
      lastCalibrationTime: Date.now()
    };

    this.notifyListeners();
    return this.status;
  }

  public setManualMode(mode: PowerMode | null): CalibrationStatus {
    this.manualOverride = mode;
    return this.calibrate(this.status.batteryLevel, this.status.isCharging);
  }

  public shouldRenderFrame(nowMs = performance.now()): boolean {
    const elapsed = nowMs - this.lastRenderTimestamp;
    if (elapsed >= this.status.frameIntervalMs - 1.0) { // 1ms tolerance
      this.lastRenderTimestamp = nowMs;
      return true;
    }
    return false;
  }

  public getStatus(): CalibrationStatus {
    return { ...this.status };
  }

  public onPowerModeChange(listener: (status: CalibrationStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => {
      try {
        fn(this.status);
      } catch (e) {
        console.error('Error in power mode listener:', e);
      }
    });
  }

  public reset(): void {
    this.manualOverride = null;
    this.lastRenderTimestamp = 0;
    this.listeners.clear();
    this.calibrate(1.0, true);
  }
}
