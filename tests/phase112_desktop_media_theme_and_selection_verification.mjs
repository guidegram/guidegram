import assert from 'node:assert';
import {
  UriSchemeRegistrationManager,
  FullscreenMediaWorkspaceGovernor,
  TopBarTransitionDebouncer,
  ChatCacheMigrationGovernor,
  ArticleShortcutsLegendController,
  HiDpiSelectionAlignmentGovernor,
  FreedesktopThemeAdaptor,
  DesktopMediaThemeAndSelectionGovernor
} from '../src/services/desktopMediaThemeAndSelectionGovernor.ts';

console.log('--- STARTING PHASE 112 VERIFICATION TEST SUITE ---');

// 1. UriSchemeRegistrationManager tests (kotatogram/kotatogram-desktop#244)
console.log('Test 1: UriSchemeRegistrationManager -noregister flag respect');
const uriMgr = new UriSchemeRegistrationManager();

const blockedResult = uriMgr.shouldRegisterProtocol({
  cliFlags: ['-noregister'],
  enableSchemeRegistrationConfig: true
});
assert.strictEqual(blockedResult.registerAllowed, false, 'Should strictly obey -noregister CLI flag');
assert(blockedResult.reason.includes('-noregister'));

const allowedResult = uriMgr.shouldRegisterProtocol({
  cliFlags: ['--autostart'],
  enableSchemeRegistrationConfig: true
});
assert.strictEqual(allowedResult.registerAllowed, true);

// 2. FullscreenMediaWorkspaceGovernor tests (kotatogram/kotatogram-desktop#94)
console.log('Test 2: FullscreenMediaWorkspaceGovernor black workspace prevention');
const fsGov = new FullscreenMediaWorkspaceGovernor();

// Window is not fullscreen: separate window allowed
fsGov.setFullscreen(false);
const normalViewer = fsGov.openMediaViewer('photo_77');
assert.strictEqual(normalViewer.renderedMode, 'separate_window');

// Window enters fullscreen mode: MUST use inline modal overlay to prevent OS space desync
fsGov.setFullscreen(true);
const fsViewer = fsGov.openMediaViewer('video_88');
assert.strictEqual(fsViewer.renderedMode, 'inline_fullscreen_modal', 'Must lock to inline modal in fullscreen to prevent black workspace');

fsGov.closeMediaViewer();
assert.strictEqual(fsGov.getWindowState().activeViewerId, null);

// 3. TopBarTransitionDebouncer tests (telegramdesktop/tdesktop#31485)
console.log('Test 3: TopBarTransitionDebouncer flashing prevention');
const topBar = new TopBarTransitionDebouncer(30);

const switch1 = topBar.updateContent({
  chatId: 'chat_alpha',
  title: 'Alpha Channel',
  subtitle: '10,000 members'
});
assert.strictEqual(switch1.renderedContent.title, 'Alpha Channel');

const switch2 = topBar.updateContent({
  chatId: 'chat_beta',
  title: 'Beta Group',
  subtitle: 'online'
});
assert.strictEqual(switch2.renderedContent.title, 'Beta Group');
assert.strictEqual(topBar.getRenderedContent().chatId, 'chat_beta');

// 4. ChatCacheMigrationGovernor tests (telegramdesktop/tdesktop#31269)
console.log('Test 4: ChatCacheMigrationGovernor disappearing chats recovery');
const cacheGov = new ChatCacheMigrationGovernor();

const initialChats = [
  { id: 'chat_1', title: 'Work', lastMessageId: 100 },
  { id: 'chat_2', title: 'Family', lastMessageId: 200 }
];
cacheGov.saveSnapshot(initialChats);

// Simulate DB schema upgrade bug where DB returns empty array
const loadResult = cacheGov.loadChats([], 5, 4);
assert.strictEqual(loadResult.recoveredFromSnapshot, true, 'Must recover chats from snapshot if update results in empty chat list');
assert.strictEqual(loadResult.chats.length, 2);
assert.strictEqual(loadResult.chats[0].title, 'Work');

// 5. ArticleShortcutsLegendController tests (telegramdesktop/tdesktop#31516)
console.log('Test 5: ArticleShortcutsLegendController shortcuts legend inside toggles');
const legendCtrl = new ArticleShortcutsLegendController();
assert.strictEqual(legendCtrl.isLegendVisible(), false);

// Event triggered inside <summary> or <details>
const handled = legendCtrl.handleShortcutTrigger({
  key: '/',
  ctrlKey: true,
  metaKey: false,
  activeElementTag: 'summary'
});
assert.strictEqual(handled.consumed, true);
assert.strictEqual(handled.legendOpen, true);
assert.strictEqual(legendCtrl.isLegendVisible(), true);

// Close on second trigger
const closed = legendCtrl.handleShortcutTrigger({
  key: 'F1',
  ctrlKey: false,
  metaKey: false
});
assert.strictEqual(closed.legendOpen, false);

// 6. HiDpiSelectionAlignmentGovernor tests (telegramdesktop/tdesktop#25673)
console.log('Test 6: HiDpiSelectionAlignmentGovernor subpixel text alignment');
const hiDpiGov = new HiDpiSelectionAlignmentGovernor();

// Float coords on 1.75x scaling factor
const snapped = hiDpiGov.snapToDevicePixels(
  { x: 10.333, y: 20.666, width: 100.123, height: 16.456 },
  1.75
);
// x * 1.75 = 18.08275 -> round = 18 -> 18 / 1.75 = 10.2857...
assert(Math.abs(snapped.x * 1.75 - Math.round(snapped.x * 1.75)) < 0.0001, 'Should snap cleanly to physical device pixels');
assert(snapped.width > 0 && snapped.height > 0);

// 7. FreedesktopThemeAdaptor tests (telegramdesktop/tdesktop#26370)
console.log('Test 7: FreedesktopThemeAdaptor freedesktop dark style auto-sync');
const themeAdaptor = new FreedesktopThemeAdaptor();

// System mode with dark preference
themeAdaptor.setConfiguredTheme('system');
themeAdaptor.updateSystemSignal(true);
assert.strictEqual(themeAdaptor.getEffectiveTheme(), 'dark');

themeAdaptor.updateSystemSignal(false);
assert.strictEqual(themeAdaptor.getEffectiveTheme(), 'light');

// Forced user override
themeAdaptor.setConfiguredTheme('dark');
assert.strictEqual(themeAdaptor.getEffectiveTheme(), 'dark');

// 8. Master Governor instantiation
console.log('Test 8: Master Governor instantiation');
const masterGov = new DesktopMediaThemeAndSelectionGovernor();
assert(masterGov.uriScheme instanceof UriSchemeRegistrationManager);
assert(masterGov.fullscreenWorkspace instanceof FullscreenMediaWorkspaceGovernor);
assert(masterGov.topBarDebouncer instanceof TopBarTransitionDebouncer);
assert(masterGov.cacheMigration instanceof ChatCacheMigrationGovernor);
assert(masterGov.shortcutsLegend instanceof ArticleShortcutsLegendController);
assert(masterGov.hiDpiSelection instanceof HiDpiSelectionAlignmentGovernor);
assert(masterGov.themeAdaptor instanceof FreedesktopThemeAdaptor);

console.log('--- ALL PHASE 112 VERIFICATION TESTS PASSED (100%) ---');
