import assert from 'node:assert';
import {
  VimModalKeybindingController,
  Arm64HardwareSimdDispatcher,
  WaylandWindowEnvironmentGovernor,
  PortableDataPathResolver,
  RuntimeMemoryHardeningGovernor,
  NativeDesktopStyleAdaptor,
  ApiLayerDeprecationHandler,
  DesktopVimArm64WaylandAndSecurityGovernor
} from '../src/services/desktopVimArm64WaylandAndSecurityGovernor.ts';

console.log('--- STARTING PHASE 115 VERIFICATION TEST SUITE ---');

// 1. VimModalKeybindingController tests (kotatogram/kotatogram-desktop#371)
console.log('Test 1: VimModalKeybindingController modal keybindings (normal/insert)');
const vim = new VimModalKeybindingController();
assert.strictEqual(vim.getMode(), 'normal');

// j / k navigation in normal mode
const navDown = vim.handleKey('j', false);
assert.strictEqual(navDown.action, 'nav_next');
assert.strictEqual(navDown.consumed, true);

const navUp = vim.handleKey('k', false);
assert.strictEqual(navUp.action, 'nav_prev');
assert.strictEqual(navUp.consumed, true);

// gg scroll top
const firstG = vim.handleKey('g', false);
assert.strictEqual(firstG.action, 'none');
const secondG = vim.handleKey('g', false);
assert.strictEqual(secondG.action, 'scroll_top');

// Enter insert mode with 'i'
const enterIns = vim.handleKey('i', false);
assert.strictEqual(enterIns.mode, 'insert');
assert.strictEqual(enterIns.action, 'enter_insert');
assert.strictEqual(vim.getMode(), 'insert');

// In insert mode, letters are passed through unconsumed
const typing = vim.handleKey('j', true);
assert.strictEqual(typing.consumed, false);

// Escape returns to normal mode
const esc = vim.handleKey('Escape', true);
assert.strictEqual(esc.mode, 'normal');
assert.strictEqual(esc.action, 'exit_insert');
assert.strictEqual(vim.getMode(), 'normal');

// 2. Arm64HardwareSimdDispatcher tests (telegramdesktop/tdesktop#25266)
console.log('Test 2: Arm64HardwareSimdDispatcher Windows on ARM64 NEON dispatch');
const simdDisp = new Arm64HardwareSimdDispatcher();

const arm64Result = simdDisp.dispatchSimdPipeline('arm64');
assert.strictEqual(arm64Result.pipeline, 'neon');
assert.strictEqual(arm64Result.isNativeArm64, true);

const x64Result = simdDisp.dispatchSimdPipeline('x64');
assert.strictEqual(x64Result.pipeline, 'avx2');
assert.strictEqual(x64Result.isNativeArm64, false);

// 3. WaylandWindowEnvironmentGovernor tests (telegramdesktop/tdesktop#2353)
console.log('Test 3: WaylandWindowEnvironmentGovernor Wayland CSD resolution');
const waylandGov = new WaylandWindowEnvironmentGovernor();

const waylandResult = waylandGov.resolveWindowDecorations('wayland');
assert.strictEqual(waylandResult.isWayland, true);
assert.strictEqual(waylandResult.useClientSideDecorations, true);
assert.strictEqual(waylandResult.subsurfaceIntegration, true);

const x11Result = waylandGov.resolveWindowDecorations('x11');
assert.strictEqual(x11Result.isWayland, false);
assert.strictEqual(x11Result.useClientSideDecorations, false);

// 4. PortableDataPathResolver tests (telegramdesktop/tdesktop#2355)
console.log('Test 4: PortableDataPathResolver portable mode vs AppData');
const pathResolver = new PortableDataPathResolver();

// Portable mode detected
const portable = pathResolver.resolveDataPath({
  executableDirPath: 'D:/PortableApps/Guidegram',
  hasAdjacentTdata: true,
  hasPortableFlag: false,
  systemAppDataPath: 'C:/Users/User/AppData/Roaming'
});
assert.strictEqual(portable.isPortable, true);
assert.strictEqual(portable.resolvedPath, 'D:/PortableApps/Guidegram/tdata');

// Standard installed mode
const installed = pathResolver.resolveDataPath({
  executableDirPath: 'C:/Program Files/Guidegram',
  hasAdjacentTdata: false,
  hasPortableFlag: false,
  systemAppDataPath: 'C:/Users/User/AppData/Roaming'
});
assert.strictEqual(installed.isPortable, false);
assert.strictEqual(installed.resolvedPath, 'C:/Users/User/AppData/Roaming/Guidegram/tdata');

// 5. RuntimeMemoryHardeningGovernor tests (telegramdesktop/tdesktop#1112)
console.log('Test 5: RuntimeMemoryHardeningGovernor cryptographic key memory zeroing');
const memHardener = new RuntimeMemoryHardeningGovernor();
const secretKey = new Uint8Array([0xCA, 0xFE, 0xBA, 0xBE, 0x12, 0x34, 0x56, 0x78]);
assert.strictEqual(memHardener.isZeroed(secretKey), false);

memHardener.wipeSensitiveBuffer(secretKey);
assert.strictEqual(memHardener.isZeroed(secretKey), true, 'Buffer must be completely zeroed');

// 6. NativeDesktopStyleAdaptor tests (telegramdesktop/tdesktop#987)
console.log('Test 6: NativeDesktopStyleAdaptor OS style compliance');
const styleAdaptor = new NativeDesktopStyleAdaptor();

const macStyle = styleAdaptor.resolveThemeStyle('darwin');
assert.strictEqual(macStyle.themeName, 'macOS-Aqua');

const winStyle = styleAdaptor.resolveThemeStyle('win32');
assert.strictEqual(winStyle.themeName, 'Windows-Fluent');

const kdeStyle = styleAdaptor.resolveThemeStyle('linux', 'KDE Plasma');
assert.strictEqual(kdeStyle.themeName, 'Breeze');

// 7. ApiLayerDeprecationHandler tests (kotatogram/kotatogram-desktop#256)
console.log('Test 7: ApiLayerDeprecationHandler deprecation warning handling');
const depHandler = new ApiLayerDeprecationHandler();

// No deprecation
const okResult = depHandler.evaluateDeprecation();
assert.strictEqual(okResult.status, 'ok');

// Deprecated with 20 days remaining
const warnResult = depHandler.evaluateDeprecation({
  isDeprecated: true,
  sunsetTimestamp: Date.now() + 20 * 86400 * 1000
});
assert.strictEqual(warnResult.status, 'warning');
assert.strictEqual(warnResult.daysRemaining, 20);

// Urgent deprecation with 2 days remaining
const urgentResult = depHandler.evaluateDeprecation({
  isDeprecated: true,
  sunsetTimestamp: Date.now() + 2 * 86400 * 1000
});
assert.strictEqual(urgentResult.status, 'urgent_update');

// 8. Master Governor instantiation
console.log('Test 8: Master Governor instantiation');
const masterGov = new DesktopVimArm64WaylandAndSecurityGovernor();
assert(masterGov.vimController instanceof VimModalKeybindingController);
assert(masterGov.simdDispatcher instanceof Arm64HardwareSimdDispatcher);
assert(masterGov.waylandGovernor instanceof WaylandWindowEnvironmentGovernor);
assert(masterGov.pathResolver instanceof PortableDataPathResolver);
assert(masterGov.memoryHardener instanceof RuntimeMemoryHardeningGovernor);
assert(masterGov.styleAdaptor instanceof NativeDesktopStyleAdaptor);
assert(masterGov.deprecationHandler instanceof ApiLayerDeprecationHandler);

console.log('--- ALL PHASE 115 VERIFICATION TESTS PASSED (100%) ---');
