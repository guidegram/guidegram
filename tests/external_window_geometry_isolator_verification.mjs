/**
 * External Window Geometry Isolator Verification Suite
 */

import { ExternalWindowGeometryIsolator } from '../dist-test-window/externalWindowGeometryIsolator.js';
import assert from 'node:assert';

console.log('--- Starting External Window Geometry Isolator Verification ---');

const isolator = new ExternalWindowGeometryIsolator();

// 1. Register main window and external chat window
const mainWorkArea = { x: 0, y: 0, width: 1920, height: 1080 };
isolator.registerWindow('win_main', 'main', { x: 100, y: 100, width: 1000, height: 700 }, { minWidth: 600, minHeight: 400 }, mainWorkArea);
isolator.registerWindow('win_ext_1', 'external_chat', { x: 500, y: 200, width: 800, height: 600 }, { minWidth: 400, minHeight: 300 }, mainWorkArea);

const mainWin = isolator.getWindow('win_main');
const extWin = isolator.getWindow('win_ext_1');

assert.strictEqual(mainWin?.bounds.width, 1000, 'Main window initial width must be 1000');
assert.strictEqual(extWin?.bounds.width, 800, 'External window initial width must be 800');
console.log('✅ Check 1 Passed: Windows registered independently with distinct geometries.');

// 2. Validate resize event cross-window bleed prevention
const crossWindowValidation = isolator.validateResizeEvent('win_ext_1', 'win_main');
assert.strictEqual(crossWindowValidation.allowed, false, 'External window must not be allowed to resize main window');
assert.ok(crossWindowValidation.reason?.includes('Geometry Bleed Denied'), 'Validation reason must mention Geometry Bleed Denied');

const selfValidation = isolator.validateResizeEvent('win_ext_1', 'win_ext_1');
assert.strictEqual(selfValidation.allowed, true, 'External window must be allowed to resize itself');
console.log('✅ Check 2 Passed: Cross-window resize requests rejected to prevent bleed.');

// 3. Toggling third section (stickers) in external window expands ONLY external window
const expandResult = isolator.computeThirdSectionToggle('win_ext_1', 'stickers', 360);
assert.strictEqual(expandResult.action, 'expanded', 'Action must be expanded');
assert.strictEqual(expandResult.targetWindowId, 'win_ext_1', 'Target window must be win_ext_1');
assert.strictEqual(expandResult.newBounds.width, 1160, 'External window width must expand by 360 to 1160');
assert.strictEqual(expandResult.bleedPrevented, true, 'Bleed must be prevented from affecting main window');

// Re-check main window bounds - must remain completely untouched
const mainAfterExtExpand = isolator.getWindow('win_main');
assert.strictEqual(mainAfterExtExpand?.bounds.width, 1000, 'Main window width must strictly remain 1000');
console.log('✅ Check 3 Passed: Sticker panel expansion in external window isolates geometry; main window untouched.');

// 4. Switching third section from stickers to info panel maintains width and changes active section
const switchResult = isolator.computeThirdSectionToggle('win_ext_1', 'info', 360);
assert.strictEqual(switchResult.action, 'noop', 'Switching section when already open should not re-expand');
assert.strictEqual(isolator.getWindow('win_ext_1')?.activeThirdSection, 'info', 'Active section should be info');
assert.strictEqual(isolator.getWindow('win_ext_1')?.bounds.width, 1160, 'Width must remain 1160');
console.log('✅ Check 4 Passed: Switching third section keeps single panel width without stacking.');

// 5. Collapsing third section restores exact pre-expansion width
const collapseResult = isolator.computeThirdSectionToggle('win_ext_1', 'none', 360);
assert.strictEqual(collapseResult.action, 'collapsed', 'Action must be collapsed');
assert.strictEqual(collapseResult.newBounds.width, 800, 'External window width must restore to 800');
assert.strictEqual(isolator.getWindow('win_ext_1')?.bounds.width, 800, 'Window bounds must be restored in registry');
assert.strictEqual(isolator.getWindow('win_main')?.bounds.width, 1000, 'Main window still unaffected');
console.log('✅ Check 5 Passed: Collapsing panel cleanly restores pre-expansion geometry.');

// 6. Work area clamping when external window expands near screen right edge
isolator.registerWindow('win_ext_edge', 'external_chat', { x: 1600, y: 100, width: 300, height: 500 }, { minWidth: 300, minHeight: 300 }, mainWorkArea);
const edgeExpandResult = isolator.computeThirdSectionToggle('win_ext_edge', 'stickers', 360);
assert.strictEqual(edgeExpandResult.clampedToWorkArea, true, 'Window near edge must be clamped to work area');
assert.ok(edgeExpandResult.newBounds.x + edgeExpandResult.newBounds.width <= 1920, 'Right edge must not exceed display bounds');
console.log('✅ Check 6 Passed: Display work area clamping prevents offscreen window expansion.');

// 7. Unregistering window cleans up state
isolator.unregisterWindow('win_ext_1');
assert.strictEqual(isolator.getWindow('win_ext_1'), undefined, 'Unregistered window must be removed');
console.log('✅ Check 7 Passed: Window lifecycle cleanup verified.');

console.log('🎉 ALL 7 EXTERNAL WINDOW GEOMETRY ISOLATION CHECKS PASSED SUCCESSFULLY!');
