import assert from 'node:assert';
import {
  CustomApiCredentialsManager,
  CrossPlatformAutostartGovernor,
  FramelessTitleBarController,
  InlinePostTranslationManager,
  MutualUserHistoryAggregator,
  CopyProtectionAccessibilityBridge,
  ProtocolCompatibilityNegotiator,
  DesktopCustomCredsTitlebarAndHistoryGovernor
} from '../src/services/desktopCustomCredsTitlebarAndHistoryGovernor.ts';

console.log('--- STARTING PHASE 114 VERIFICATION TEST SUITE ---');

// 1. CustomApiCredentialsManager tests (kotatogram/kotatogram-desktop#424)
console.log('Test 1: CustomApiCredentialsManager dynamic API credentials');
const credsMgr = new CustomApiCredentialsManager();
assert.strictEqual(credsMgr.getCredentials().isCustom, false);

// Invalid credentials validation
const badId = credsMgr.setCustomCredentials(-5, 'abc');
assert.strictEqual(badId.success, false);
const badHash = credsMgr.setCustomCredentials(12345, 'short');
assert.strictEqual(badHash.success, false);

// Valid custom credentials
const good = credsMgr.setCustomCredentials(987654, '0123456789abcdef0123456789abcdef');
assert.strictEqual(good.success, true);
assert.strictEqual(credsMgr.getCredentials().isCustom, true);
assert.strictEqual(credsMgr.getCredentials().apiId, 987654);

credsMgr.resetToDefault();
assert.strictEqual(credsMgr.getCredentials().isCustom, false);

// 2. CrossPlatformAutostartGovernor tests (kotatogram/kotatogram-desktop#411)
console.log('Test 2: CrossPlatformAutostartGovernor Linux/Windows/macOS autostart configs');
const autostartGov = new CrossPlatformAutostartGovernor();

const linuxCfg = autostartGov.generateAutostartConfig('linux', '/usr/bin/guidegram', true);
assert.strictEqual(linuxCfg.filePath, '~/.config/autostart/guidegram.desktop');
assert(linuxCfg.content.includes('Exec=/usr/bin/guidegram -autostart'));
assert(linuxCfg.content.includes('X-GNOME-Autostart-enabled=true'));

const winCfg = autostartGov.generateAutostartConfig('win32', 'C:\\Guidegram\\guidegram.exe', true);
assert.strictEqual(winCfg.registryKey, 'Guidegram');
assert(winCfg.content.includes('-autostart'));

const macCfg = autostartGov.generateAutostartConfig('darwin', '/Applications/Guidegram.app', true);
assert.strictEqual(macCfg.filePath, '~/Library/LaunchAgents/org.guidegram.desktop.plist');
assert(macCfg.content.includes('<key>RunAtLoad</key>'));

// 3. FramelessTitleBarController tests (kotatogram/kotatogram-desktop#91)
console.log('Test 3: FramelessTitleBarController title bar toggle and draggable regions');
const titleBarCtrl = new FramelessTitleBarController();

// Default mode: standard title bar
assert.strictEqual(titleBarCtrl.isTitleBarVisible(), true);
const normalLayout = titleBarCtrl.computeWindowLayout();
assert.strictEqual(normalLayout.useNativeWindowFrame, true);
assert.strictEqual(normalLayout.showCustomControls, false);

// Compact mode: hide title bar
titleBarCtrl.setTitleBarHidden(true);
assert.strictEqual(titleBarCtrl.isTitleBarVisible(), false);
const compactLayout = titleBarCtrl.computeWindowLayout();
assert.strictEqual(compactLayout.useNativeWindowFrame, false);
assert.strictEqual(compactLayout.showCustomControls, true);
assert.strictEqual(compactLayout.draggableRegionClass, 'app-drag-region');

// 4. InlinePostTranslationManager tests (kotatogram/kotatogram-desktop#59)
console.log('Test 4: InlinePostTranslationManager post translation & LRU cache');
const transMgr = new InlinePostTranslationManager();

let callCount = 0;
const mockTranslate = async (txt, tgt) => {
  callCount++;
  return `[Mock-${tgt}]: ${txt}`;
};

const res1 = await transMgr.translatePost('post_1', 'Hello world', 'fa', mockTranslate);
assert.strictEqual(res1.translatedText, '[Mock-fa]: Hello world');
assert.strictEqual(res1.fromCache, false);
assert.strictEqual(callCount, 1);

// Second call should hit cache without calling translator function again
const res2 = await transMgr.translatePost('post_1', 'Hello world', 'fa', mockTranslate);
assert.strictEqual(res2.translatedText, '[Mock-fa]: Hello world');
assert.strictEqual(res2.fromCache, true);
assert.strictEqual(callCount, 1);

// 5. MutualUserHistoryAggregator tests (kotatogram/kotatogram-desktop#9)
console.log('Test 5: MutualUserHistoryAggregator mutual user history aggregation');
const histAgg = new MutualUserHistoryAggregator();

const sampleMessages = [
  { messageId: 1, chatId: 'group_A', chatTitle: 'Work Group', senderId: 'user_bob', text: 'Hey all', date: new Date() },
  { messageId: 2, chatId: 'group_B', chatTitle: 'Hobby Group', senderId: 'user_bob', text: 'Look at this photo', date: new Date() },
  { messageId: 3, chatId: 'group_A', chatTitle: 'Work Group', senderId: 'user_alice', text: 'Good morning', date: new Date() }
];

const aggregated = histAgg.aggregateUserHistory('user_bob', sampleMessages);
assert.strictEqual(aggregated.totalMessagesFound, 2);
assert.strictEqual(aggregated.messagesByChat['group_A'].length, 1);
assert.strictEqual(aggregated.messagesByChat['group_B'].length, 1);

// 6. CopyProtectionAccessibilityBridge tests (kotatogram/kotatogram-desktop#430)
console.log('Test 6: CopyProtectionAccessibilityBridge screen-reader accessible content');
const copyBridge = new CopyProtectionAccessibilityBridge();

// Normal channel
const normalMsg = copyBridge.extractAccessibleContent({
  text: 'Open public post',
  isRestrictedChannel: false,
  requireAccessibilityExtract: false
});
assert.strictEqual(normalMsg.canCopyDirectly, true);
assert.strictEqual(normalMsg.extractedText, 'Open public post');

// Restricted channel (no-copy): direct copy blocked, accessibility extraction permitted
const restrictedMsg = copyBridge.extractAccessibleContent({
  text: 'Exclusive paid analysis',
  isRestrictedChannel: true,
  requireAccessibilityExtract: true
});
assert.strictEqual(restrictedMsg.canCopyDirectly, false, 'Direct copy must remain blocked in restricted chats');
assert.strictEqual(restrictedMsg.extractedText, 'Exclusive paid analysis', 'Accessibility reader extraction allowed');
assert(restrictedMsg.accessibleAltText.includes('Restricted content audio description'));

// 7. ProtocolCompatibilityNegotiator tests (kotatogram/kotatogram-desktop#466)
console.log('Test 7: ProtocolCompatibilityNegotiator layer compatibility negotiation');
const protoGov = new ProtocolCompatibilityNegotiator();

// Layer <= current client layer
const nativeResult = protoGov.negotiatePayload({
  layer: 170,
  currentClientLayer: 180,
  hasReadableText: true
});
assert.strictEqual(nativeResult.action, 'render_native');

// Newer layer with partial readable text
const partialResult = protoGov.negotiatePayload({
  layer: 200,
  currentClientLayer: 180,
  hasReadableText: true,
  summaryPreview: 'Poll: Favorite IDE?'
});
assert.strictEqual(partialResult.action, 'render_fallback_card');
assert.strictEqual(partialResult.userMessage, 'Poll: Favorite IDE?');

// Newer layer completely unreadable
const unreadableResult = protoGov.negotiatePayload({
  layer: 210,
  currentClientLayer: 180,
  hasReadableText: false
});
assert.strictEqual(unreadableResult.action, 'show_update_modal');

// 8. Master Governor instantiation
console.log('Test 8: Master Governor instantiation');
const masterGov = new DesktopCustomCredsTitlebarAndHistoryGovernor();
assert(masterGov.apiCreds instanceof CustomApiCredentialsManager);
assert(masterGov.autostart instanceof CrossPlatformAutostartGovernor);
assert(masterGov.titleBar instanceof FramelessTitleBarController);
assert(masterGov.postTranslation instanceof InlinePostTranslationManager);
assert(masterGov.mutualHistory instanceof MutualUserHistoryAggregator);
assert(masterGov.copyBridge instanceof CopyProtectionAccessibilityBridge);
assert(masterGov.protocolNegotiator instanceof ProtocolCompatibilityNegotiator);

console.log('--- ALL PHASE 114 VERIFICATION TESTS PASSED (100%) ---');
