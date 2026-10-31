/**
 * Media Viewer Window Manager Verification Suite
 * Verifies decoupling of workArea maximization from kiosk fullscreen (TDesktop #31520)
 */

import { MediaViewerWindowManager } from '../dist-test-viewer/mediaViewerWindowManager.js';
import assert from 'node:assert';

console.log('--- Starting Media Viewer Window Manager Verification ---');

const workArea = { x: 0, y: 0, width: 1920, height: 1040 }; // 40px bottom taskbar
const displayBounds = { x: 0, y: 0, width: 1920, height: 1080 };
const manager = new MediaViewerWindowManager(workArea, displayBounds);

// 1. Initial mode is normal
assert.strictEqual(manager.getDisplayMode(), 'normal');
const initialGeo = manager.getCurrentGeometry();
assert.strictEqual(initialGeo.width, 960);
assert.strictEqual(initialGeo.height, 600);
console.log('✅ Check 1 Passed: Initial state is normal floating window.');

// 2. Maximizing with allowMaximizeWithoutFullscreen=true maximizes strictly within workArea
const maxGeo = manager.handleMaximizeRequest();
assert.strictEqual(manager.getDisplayMode(), 'maximized');
assert.strictEqual(maxGeo.height, 1040, 'Must NOT cover the 40px taskbar');
assert.strictEqual(maxGeo.width, 1920);
assert.strictEqual(maxGeo.y, 0);
console.log('✅ Check 2 Passed: Maximizing respects workArea leaving taskbar visible.');

// 3. Maximizing again toggles back to normal
const restoredGeo = manager.handleMaximizeRequest();
assert.strictEqual(manager.getDisplayMode(), 'normal');
assert.strictEqual(restoredGeo.width, 960);
assert.strictEqual(restoredGeo.height, 600);
console.log('✅ Check 3 Passed: Maximizing while maximized restores normal geometry.');

// 4. Background click dismissal hit-test in Maximized mode
manager.handleMaximizeRequest(); // back to maximized
assert.strictEqual(manager.getDisplayMode(), 'maximized');

// Active media photo in center: (460, 120, 1000, 800)
manager.setActiveMediaBox({ x: 460, y: 120, width: 1000, height: 800 });

// Click on empty backdrop (e.g. at (100, 100)) -> should dismiss
assert.strictEqual(manager.shouldDismissOnBackgroundClick(100, 100), true, 'Clicking empty backdrop must dismiss viewer');

// Click on media photo (e.g. at (500, 200)) -> must NOT dismiss
assert.strictEqual(manager.shouldDismissOnBackgroundClick(500, 200), false, 'Clicking on media photo must not dismiss viewer');
console.log('✅ Check 4 Passed: Background click-to-dismiss invariant preserved in Maximized state.');

// 5. Explicit Fullscreen is distinct and covers full display (1080p)
const fullGeo = manager.toggleFullscreen();
assert.strictEqual(manager.getDisplayMode(), 'fullscreen');
assert.strictEqual(fullGeo.height, 1080, 'Fullscreen covers full 1080px display');
assert.strictEqual(fullGeo.width, 1920);

// Toggling fullscreen restores normal
const exitFullGeo = manager.toggleFullscreen();
assert.strictEqual(manager.getDisplayMode(), 'normal');
assert.strictEqual(exitFullGeo.height, 600);
console.log('✅ Check 5 Passed: Explicit fullscreen covers display and toggles cleanly.');

// 6. When AeroSnapMaximizePolicy is false, maximize request routes to fullscreen (legacy fallback)
manager.setAeroSnapMaximizePolicy(false);
const coercedGeo = manager.handleMaximizeRequest();
assert.strictEqual(manager.getDisplayMode(), 'fullscreen');
assert.strictEqual(coercedGeo.height, 1080);
console.log('✅ Check 6 Passed: Legacy fullscreen coercion configurable via policy.');

console.log('🎉 ALL 6 MEDIA VIEWER WINDOW MANAGER CHECKS PASSED!');
