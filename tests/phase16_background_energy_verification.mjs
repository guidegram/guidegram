import assert from 'node:assert';
import {
  IdleBackgroundSleepCoordinator,
  NotificationBannerDomRecycler,
  WindowZOrderAndCompositionGuard,
  BatteryDrainAndWakeLockGuard,
} from '../src/services/backgroundEnergyAndMemoryOptimizer.ts';

function runTests() {
  console.log('[Phase 16 Verification] Starting tests...');

  // --- Test 1: IdleBackgroundSleepCoordinator (#29, #16062) ---
  const sleepCoordinator = new IdleBackgroundSleepCoordinator();
  assert.strictEqual(sleepCoordinator.getCurrentState(), 'foreground');
  assert.strictEqual(sleepCoordinator.getPingIntervalSec(), 30);
  assert.strictEqual(sleepCoordinator.areAnimationsPaused(), false);

  // User minimizes window to tray
  const bgState = sleepCoordinator.onWindowVisibilityChange(false, true);
  assert.strictEqual(bgState, 'background_idle');
  assert.strictEqual(sleepCoordinator.getPingIntervalSec(), 120, 'Ping interval must relax to 120s in background');
  assert.strictEqual(sleepCoordinator.areAnimationsPaused(), true, 'Animations must be paused to eliminate idle CPU drain');

  // User un-minimizes window
  const fgState = sleepCoordinator.onWindowVisibilityChange(true, false);
  assert.strictEqual(fgState, 'foreground');
  assert.strictEqual(sleepCoordinator.areAnimationsPaused(), false);
  console.log('✓ Test 1: IdleBackgroundSleepCoordinator passed');

  // --- Test 2: NotificationBannerDomRecycler (#28037) ---
  const toastRecycler = new NotificationBannerDomRecycler(3);

  toastRecycler.enqueueToast('Message 1', 'Hey');
  toastRecycler.enqueueToast('Message 2', 'How are you');
  toastRecycler.enqueueToast('Message 3', 'Check this out');
  toastRecycler.enqueueToast('Message 4', 'Fourth message'); // Should evict Message 1

  const active = toastRecycler.getActiveToasts();
  assert.strictEqual(active.length, 3, 'Must strictly cap visible banners to 3');
  assert.strictEqual(active[0].title, 'Message 2');
  assert.strictEqual(active[2].title, 'Message 4');

  // Purge expired
  const now = Date.now();
  const purged = toastRecycler.purgeExpired(now + 5000);
  assert.strictEqual(purged, 3, 'All 3 must be purged after expiration');
  assert.strictEqual(toastRecycler.getActiveToasts().length, 0);
  console.log('✓ Test 2: NotificationBannerDomRecycler passed');

  // --- Test 3: WindowZOrderAndCompositionGuard (#3253) ---
  const zOrderGuard = new WindowZOrderAndCompositionGuard();
  zOrderGuard.setAlwaysOnTop(false, true);
  zOrderGuard.lockUserPreference();

  // Rogue programmatic background attempt to force alwaysOnTop
  const rogueOverride = zOrderGuard.setAlwaysOnTop(true, false);
  assert.strictEqual(rogueOverride, false, 'Rogue background override must be blocked');
  assert.strictEqual(zOrderGuard.getAlwaysOnTop(), false);

  // Explicit user action succeeds
  const userOverride = zOrderGuard.setAlwaysOnTop(true, true);
  assert.strictEqual(userOverride, true);
  assert.strictEqual(zOrderGuard.getAlwaysOnTop(), true);
  console.log('✓ Test 3: WindowZOrderAndCompositionGuard passed');

  // --- Test 4: BatteryDrainAndWakeLockGuard ---
  const batteryGuard = new BatteryDrainAndWakeLockGuard();

  // Normal battery 80% discharging
  const normalPower = batteryGuard.evaluateBatteryStatus(0.8, false);
  assert.strictEqual(normalPower.isLowPowerMode, false);
  assert.strictEqual(normalPower.recommendedMaxFps, 60);

  // Low battery 15% discharging -> low power mode
  const lowPower = batteryGuard.evaluateBatteryStatus(0.15, false);
  assert.strictEqual(lowPower.isLowPowerMode, true);
  assert.strictEqual(lowPower.recommendedMaxFps, 30);

  // Low battery 15% but plugged into charger -> normal mode
  const chargingPower = batteryGuard.evaluateBatteryStatus(0.15, true);
  assert.strictEqual(chargingPower.isLowPowerMode, false);
  assert.strictEqual(chargingPower.recommendedMaxFps, 60);
  console.log('✓ Test 4: BatteryDrainAndWakeLockGuard passed');

  console.log('[Phase 16 Verification] ALL VERIFICATION TESTS PASSED!');
}

runTests();
