import assert from 'node:assert';
import {
  WideRightSidebarController,
  PremiumUiPromotionsSuppressor,
  ComposerDefaultFormattingGovernor,
  SavedMessagesQuickShortcutManager,
  WindowsTaskbarIconRegistrationManager,
  EnterpriseTeamgramBridgeGovernor,
  FrameworkDecouplingAdaptor,
  DesktopSidebarPremiumAndWorkspaceGovernor
} from '../src/services/desktopSidebarPremiumAndWorkspaceGovernor.ts';

console.log('--- STARTING PHASE 118 VERIFICATION TEST SUITE ---');

// 1. WideRightSidebarController tests (kotatogram/kotatogram-desktop#440)
console.log('Test 1: WideRightSidebarController wide right sidebar sizing & tabs');
const sidebar = new WideRightSidebarController();
assert.strictEqual(sidebar.getConfig().isOpen, false);

sidebar.openSidebar('media');
assert.strictEqual(sidebar.getConfig().isOpen, true);
assert.strictEqual(sidebar.getConfig().activeTab, 'media');

sidebar.resizeSidebar(500);
assert.strictEqual(sidebar.getConfig().widthPx, 500);

// Clamp bounds: max 600, min 320
sidebar.resizeSidebar(900);
assert.strictEqual(sidebar.getConfig().widthPx, 600);
sidebar.resizeSidebar(100);
assert.strictEqual(sidebar.getConfig().widthPx, 320);

// 2. PremiumUiPromotionsSuppressor tests (kotatogram/kotatogram-desktop#386)
console.log('Test 2: PremiumUiPromotionsSuppressor hiding promotional badges');
const premSuppressor = new PremiumUiPromotionsSuppressor();

const elements = [
  { id: 'chat_settings', isPremiumUpsell: false },
  { id: 'premium_annual_banner', isPremiumUpsell: true },
  { id: 'download_manager', isPremiumUpsell: false }
];

// Default: show all
assert.strictEqual(premSuppressor.filterUiElements(elements).length, 3);

// Enable suppression
premSuppressor.setHidePremium(true);
const filtered = premSuppressor.filterUiElements(elements);
assert.strictEqual(filtered.length, 2);
assert.strictEqual(filtered.some(e => e.id === 'premium_annual_banner'), false);

// 3. ComposerDefaultFormattingGovernor tests (kotatogram/kotatogram-desktop#376)
console.log('Test 3: ComposerDefaultFormattingGovernor message formatting enforcement');
const formatGov = new ComposerDefaultFormattingGovernor();
assert.strictEqual(formatGov.getDefaultMode(), 'markdown');

// Monospace mode
formatGov.setDefaultMode('monospace');
const monoOut = formatGov.formatOutboundText('const a = 10;');
assert(monoOut.formattedText.startsWith('```'));
assert(monoOut.formattedText.includes('const a = 10;'));

// Plaintext mode
formatGov.setDefaultMode('plaintext');
const plainOut = formatGov.formatOutboundText('**bold** and _italic_');
assert.strictEqual(plainOut.formattedText, 'bold and italic');

// 4. SavedMessagesQuickShortcutManager tests (kotatogram/kotatogram-desktop#358)
console.log('Test 4: SavedMessagesQuickShortcutManager header shortcut replacement');
const savedShortcut = new SavedMessagesQuickShortcutManager();

// Default: Edit button present
const defaultButtons = savedShortcut.getHeaderButtons('123456');
assert.strictEqual(defaultButtons.some(b => b.id === 'edit'), true);
assert.strictEqual(defaultButtons.some(b => b.id === 'saved_messages'), false);

// Replace Edit button with Saved Messages
savedShortcut.setHeaderShortcutEnabled(true);
const updatedButtons = savedShortcut.getHeaderButtons('123456');
assert.strictEqual(updatedButtons.some(b => b.id === 'edit'), false);
const savedBtn = updatedButtons.find(b => b.id === 'saved_messages');
assert(savedBtn !== undefined);
assert.strictEqual(savedBtn.action, 'open_chat:123456');

// 5. WindowsTaskbarIconRegistrationManager tests (kotatogram/kotatogram-desktop#356)
console.log('Test 5: WindowsTaskbarIconRegistrationManager AppUserModelID registration');
const taskbarMgr = new WindowsTaskbarIconRegistrationManager();

const appInfo = taskbarMgr.computeAppUserModelId('Guidegram', false);
assert.strictEqual(appInfo.appId, 'Guidegram.Desktop.App');
assert(appInfo.registryKey.includes('AppUserModelId\\Guidegram.Desktop.App'));
assert.strictEqual(appInfo.isRegistered, true);

// 6. EnterpriseTeamgramBridgeGovernor tests (kotatogram/kotatogram-desktop#462)
console.log('Test 6: EnterpriseTeamgramBridgeGovernor Teamgram enterprise endpoints');
const teamgramGov = new EnterpriseTeamgramBridgeGovernor();

teamgramGov.registerWorkspace({
  workspaceId: 'corp_alpha',
  endpointUrl: 'https://tg-internal.alpha-corp.com/api',
  isTeamgramActive: true
});

assert.strictEqual(teamgramGov.getActiveEndpoint(), 'https://api.telegram.org');
teamgramGov.switchWorkspace('corp_alpha');
assert.strictEqual(teamgramGov.getActiveEndpoint(), 'https://tg-internal.alpha-corp.com/api');

// 7. FrameworkDecouplingAdaptor tests (telegramdesktop/tdesktop#1815)
console.log('Test 7: FrameworkDecouplingAdaptor runtime GUI decoupling');
const frameworkAdaptor = new FrameworkDecouplingAdaptor();
const spec = frameworkAdaptor.getGuiBindingSpec();
assert.strictEqual(spec.decoupledFromQtNative, true);
assert.strictEqual(spec.supportsWebAudio, true);

// 8. Master Governor instantiation
console.log('Test 8: Master Governor instantiation');
const masterGov = new DesktopSidebarPremiumAndWorkspaceGovernor();
assert(masterGov.sidebar instanceof WideRightSidebarController);
assert(masterGov.premiumSuppressor instanceof PremiumUiPromotionsSuppressor);
assert(masterGov.composerFormat instanceof ComposerDefaultFormattingGovernor);
assert(masterGov.savedMessages instanceof SavedMessagesQuickShortcutManager);
assert(masterGov.taskbarIcon instanceof WindowsTaskbarIconRegistrationManager);
assert(masterGov.teamgram instanceof EnterpriseTeamgramBridgeGovernor);
assert(masterGov.frameworkAdaptor instanceof FrameworkDecouplingAdaptor);

console.log('--- ALL PHASE 118 VERIFICATION TESTS PASSED (100%) ---');
