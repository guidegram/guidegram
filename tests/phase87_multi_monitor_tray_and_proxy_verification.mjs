import assert from 'node:assert';
import { MultiMonitorTrayAndProxyGovernor } from '../src/services/multiMonitorTrayAndProxyGovernor.ts';

console.log('🧪 Starting Phase 87 Multi-Monitor, System Tray & Proxy Verification Suite...');

const governor = new MultiMonitorTrayAndProxyGovernor();

// 1. Multi-Monitor Display Target Resolution (TDesktop #5126)
console.log('  Testing multi-monitor target display resolution...');
const displays = [
  {
    id: 1,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1040 },
    scaleFactor: 1,
    isPrimary: true
  },
  {
    id: 2,
    bounds: { x: 1920, y: 0, width: 2560, height: 1440 },
    workArea: { x: 1920, y: 0, width: 2560, height: 1400 },
    scaleFactor: 1.25,
    isPrimary: false
  }
];

// Active window on monitor 2
const winOnMon2 = { x: 2100, y: 200, width: 1000, height: 800 };
const targetDisp1 = governor.resolveTargetDisplay(displays, winOnMon2);
assert.strictEqual(targetDisp1.id, 2);

// Cursor on monitor 1
const cursorOnMon1 = { x: 500, y: 500 };
const targetDisp2 = governor.resolveTargetDisplay(displays, undefined, cursorOnMon1);
assert.strictEqual(targetDisp2.id, 1);
console.log('  ✅ Multi-monitor target display resolution verified');

// 2. Taskbar & Tray Badge Synchronization (Kotatogram #170)
console.log('  Testing taskbar and tray badge synchronization...');
const sync0 = governor.syncBadgeCount(0);
assert.strictEqual(sync0.taskbarBadge, '');
assert.strictEqual(sync0.trayTooltip, 'Guidegram');

const sync5 = governor.syncBadgeCount(5);
assert.strictEqual(sync5.taskbarBadge, '5');
assert.strictEqual(sync5.trayTooltip, 'Guidegram (5 unread messages)');
console.log('  ✅ Taskbar and tray badge synchronization verified');

// 3. Minimize to Tray on Lock (Kotatogram #362)
console.log('  Testing minimize to tray on passcode lock...');
const lockRes = governor.handleLockTriggered(true);
assert.strictEqual(lockRes.locked, true);
assert.strictEqual(lockRes.minimizedToTray, true);
console.log('  ✅ Minimize to tray on passcode lock verified');

// 4. CLI Launch Flags (Kotatogram #160)
console.log('  Testing CLI launch flags for tray/start state...');
const flags = governor.parseCliFlags(['node', 'guidegram', '--minimized', '--no-tray']);
assert.strictEqual(flags.startMinimized, true);
assert.strictEqual(flags.hideTray, true);
console.log('  ✅ CLI launch flags verified');

// 5. Tray Backend Detection (TDesktop #80, #702)
console.log('  Testing system tray backend detection...');
assert.strictEqual(governor.detectTrayBackend('win32'), 'win32_shell');
assert.strictEqual(governor.detectTrayBackend('linux', 'KDE Plasma'), 'status_notifier_item');
assert.strictEqual(governor.detectTrayBackend('linux', 'GNOME 46'), 'appindicator');
console.log('  ✅ System tray backend detection verified');

// 6. Non-Modal MediaViewer Interaction (Kotatogram #227)
console.log('  Testing non-modal MediaViewer window config...');
const mediaConfig = governor.getMediaViewerWindowConfig();
assert.strictEqual(mediaConfig.isModal, false);
assert.strictEqual(mediaConfig.allowMainWindowInteraction, true);
console.log('  ✅ Non-modal MediaViewer interaction verified');

// 7. MTProxy Secret Validation (Kotatogram #114)
console.log('  Testing MTProxy secret formats (standard, dd-padded, fake-TLS)...');
// Standard 32 hex
const stdRes = governor.validateMtproxySecret('0123456789abcdef0123456789abcdef');
assert.strictEqual(stdRes.valid, true);
assert.strictEqual(stdRes.type, 'standard');

// DD-padded
const ddRes = governor.validateMtproxySecret('dd0123456789abcdef0123456789abcdef');
assert.strictEqual(ddRes.valid, true);
assert.strictEqual(ddRes.type, 'dd_padded');
assert.strictEqual(ddRes.cleanSecret, '0123456789abcdef0123456789abcdef');

// Fake-TLS (ee + 32-hex key + hex domain for "cloudflare.com")
const domainHex = Buffer.from('cloudflare.com').toString('hex');
const fakeTlsSecret = 'ee0123456789abcdef0123456789abcdef' + domainHex;
const fakeTlsRes = governor.validateMtproxySecret(fakeTlsSecret);
assert.strictEqual(fakeTlsRes.valid, true);
assert.strictEqual(fakeTlsRes.type, 'fake_tls');
assert.strictEqual(fakeTlsRes.sniDomain, 'cloudflare.com');
console.log('  ✅ MTProxy secret validation verified');

// 8. Small File Upload Pipelining (Kotatogram #402)
console.log('  Testing upload chunk pipelining for small files...');
const smallFile = governor.calculateUploadPipeline(128 * 1024); // 128KB
assert.strictEqual(smallFile.pipelineMode, 'pipelined');
assert.strictEqual(smallFile.concurrency, 4);

const largeFile = governor.calculateUploadPipeline(50 * 1024 * 1024); // 50MB
assert.strictEqual(largeFile.pipelineMode, 'sequential');
console.log('  ✅ Small file upload pipelining verified');

console.log('✨ All Phase 87 Verification Tests Passed 100% Successfully!');
