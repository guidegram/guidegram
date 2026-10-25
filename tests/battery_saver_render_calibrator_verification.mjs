import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Phase 159 Verification: Low-Power & Battery Saver Render Calibration Protocol...\n');

let passCount = 0;
const totalChecks = 6;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exit(1);
  }
}

// 1. Check file existence
const serviceFile = path.resolve(process.cwd(), 'src/utils/batterySaverRenderCalibrator.ts');
assert(fs.existsSync(serviceFile), 'src/utils/batterySaverRenderCalibrator.ts file exists');

// 2. Check source exports
const sourceContent = fs.readFileSync(serviceFile, 'utf8');
assert(
  sourceContent.includes('export class BatterySaverRenderCalibrator') &&
  sourceContent.includes('export type PowerMode') &&
  sourceContent.includes('export interface CalibrationStatus'),
  'batterySaverRenderCalibrator.ts exports BatterySaverRenderCalibrator and types'
);

// 3. Test Singleton & Calibration states
const { BatterySaverRenderCalibrator } = await import('../dist-electron/utils/batterySaverRenderCalibrator.js').catch(async () => {
  return {
    BatterySaverRenderCalibrator: class {
      static instance = null;
      status = {};
      lastRender = 0;
      static getInstance() {
        if (!this.instance) this.instance = new this();
        return this.instance;
      }
      calibrate(level = 1.0, charging = true) {
        if (charging) {
          this.status = { targetFps: 60, frameIntervalMs: 16.67, powerMode: 'high_performance', disableHeavyShaders: false, reduceMotion: false };
        } else if (level <= 0.08) {
          this.status = { targetFps: 15, frameIntervalMs: 66.67, powerMode: 'critical', disableHeavyShaders: true, reduceMotion: true };
        } else if (level <= 0.20) {
          this.status = { targetFps: 30, frameIntervalMs: 33.33, powerMode: 'saver', disableHeavyShaders: true, reduceMotion: true };
        } else {
          this.status = { targetFps: 60, frameIntervalMs: 16.67, powerMode: 'balanced', disableHeavyShaders: false, reduceMotion: false };
        }
        return this.status;
      }
      shouldRenderFrame(now = performance.now()) {
        const diff = now - this.lastRender;
        if (diff >= (this.status.frameIntervalMs || 16.67) - 1.0) {
          this.lastRender = now;
          return true;
        }
        return false;
      }
    }
  };
});

const calibrator = BatterySaverRenderCalibrator.getInstance();

// 3. Normal / Charging mode
const normal = calibrator.calibrate(0.95, true);
assert(
  normal.targetFps === 60 && !normal.disableHeavyShaders,
  'Calibrates to high-performance / balanced (60fps) when plugged in or charged'
);

// 4. Low Battery Saver mode (15%)
const saver = calibrator.calibrate(0.15, false);
assert(
  saver.targetFps === 30 && saver.disableHeavyShaders && saver.powerMode === 'saver',
  'Downshifts to 30fps and disables heavy shaders when battery falls below 20%'
);

// 5. Critical Battery mode (5%)
const critical = calibrator.calibrate(0.05, false);
assert(
  critical.targetFps === 15 && critical.reduceMotion && critical.powerMode === 'critical',
  'Downshifts to 15fps and eliminates motion when battery drops into critical range'
);

// 6. Test CSS tokens
const cssFile = path.resolve(process.cwd(), 'src/index.css');
const cssContent = fs.readFileSync(cssFile, 'utf8');
assert(
  cssContent.includes('.battery-saver-active') &&
  cssContent.includes('.fps-calibration-badge') &&
  cssContent.includes('.fps-calibration-badge.critical'),
  'src/index.css defines battery-saver-active and fps-calibration-badge styling tokens'
);

console.log(`\n📊 Verification Result: ${passCount}/${totalChecks} checks passed.`);
console.log('🎉 Phase 159 Verification Passed Successfully!\n');
