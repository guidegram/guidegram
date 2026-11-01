import assert from 'node:assert/strict';
import {
  TonWalletBroadcastGovernor,
  ExternalBrowserDispatcherGovernor,
  ShareExtensionProxyUploaderGovernor,
  MiniAppShareSheetGovernor,
  VideoNoteAudioRouteGovernor,
  IPadExternalMouseScrollGovernor,
  SpoilerRichTextLayoutGovernor
} from '../src/services/iosShareWalletScrollRouteAndSpoilerGovernor.ts';

console.log('🧪 Starting Phase 167 Verification: iOS Share, Wallet, Scroll, Route & Spoiler Hardening...');

// -------------------------------------------------------------
// Test 1: TonWalletBroadcastGovernor (Resolves #2417)
// -------------------------------------------------------------
console.log('  Testing #2417: TON Wallet Broadcast Failover on Unavailable Error...');
const walletGov = new TonWalletBroadcastGovernor([
  { url: 'https://primary-node.ton.org', isHealthy: true, latencyMs: 50, failureCount: 0 },
  { url: 'https://backup-node.ton.org', isHealthy: true, latencyMs: 90, failureCount: 0 }
]);

let callCount = 0;
const broadcastRes = await walletGov.broadcastSignedTransfer({
  signedBoc: 'te6cckEBAQEAAg==',
  transferId: 'tx_12345',
  mockRpcCaller: async (url) => {
    callCount++;
    if (url.includes('primary-node')) {
      return { status: 503, error: 'unavailable' };
    }
    return { status: 200, txHash: '0xHASH_RECOVERED_ON_BACKUP' };
  }
});

assert.equal(broadcastRes.success, true, 'Broadcast must succeed on secondary node');
assert.equal(broadcastRes.txHash, '0xHASH_RECOVERED_ON_BACKUP');
assert.equal(broadcastRes.endpointUsed, 'https://backup-node.ton.org');
assert.equal(callCount, 2, 'Must have attempted primary node then failed over to backup');
console.log('  ✅ #2417 Verified: TonWalletBroadcastGovernor gracefully recovered from unavailable error.');

// -------------------------------------------------------------
// Test 2: ExternalBrowserDispatcherGovernor (Resolves #2403)
// -------------------------------------------------------------
console.log('  Testing #2403: Brave Browser URL Scheme & Safari Fallback...');
const browserGov = new ExternalBrowserDispatcherGovernor();

const braveIntent = browserGov.resolveOpenUrl('https://example.com/guidegram?ref=app', 'brave');
assert.equal(braveIntent.browserId, 'brave');
assert.equal(braveIntent.fallbackToSafari, false);
assert.equal(braveIntent.launchUrl, 'brave://open-url?url=https%3A%2F%2Fexample.com%2Fguidegram%3Fref%3Dapp');

// Test uninstalled browser fallback to Safari
browserGov.setBrowserInstalled('brave', false);
const fallbackIntent = browserGov.resolveOpenUrl('https://example.com/guidegram', 'brave');
assert.equal(fallbackIntent.browserId, 'safari');
assert.equal(fallbackIntent.fallbackToSafari, true);
assert.equal(fallbackIntent.launchUrl, 'https://example.com/guidegram');
console.log('  ✅ #2403 Verified: External browser scheme dispatching and fallback validated.');

// -------------------------------------------------------------
// Test 3: ShareExtensionProxyUploaderGovernor (Resolves #2380)
// -------------------------------------------------------------
console.log('  Testing #2380: Web Proxy in Share Extension & Main App Enqueueing...');
const shareGov = new ShareExtensionProxyUploaderGovernor();

const syncRes = shareGov.syncProxySettingsToAppGroup({
  host: '127.0.0.1',
  port: 8080,
  type: 'http'
});
assert.equal(syncRes.synced, true);
assert.ok(syncRes.appGroupPath.includes('group.org.telegram.Telegram'));

// Scenario A: Proxy is reachable
const uploadSuccess = await shareGov.initiateShareUpload(
  {
    fileId: 'f_001',
    fileName: 'document.pdf',
    fileSizeBytes: 204800,
    targetChatId: 'chat_99',
    isBackgroundSession: true
  },
  { proxyReachable: true, directReachable: false }
);
assert.equal(uploadSuccess.status, 'uploaded_proxy');

// Scenario B: Proxy network disconnected in share extension process -> Enqueue for main app
const uploadEnqueue = await shareGov.initiateShareUpload(
  {
    fileId: 'f_002',
    fileName: 'photo.jpg',
    fileSizeBytes: 1024000,
    targetChatId: 'chat_99',
    isBackgroundSession: true
  },
  { proxyReachable: false, directReachable: false }
);
assert.equal(uploadEnqueue.status, 'enqueued_for_main_app');
assert.equal(shareGov.getPendingQueue().length, 1);
assert.equal(shareGov.getPendingQueue()[0].fileName, 'photo.jpg');
console.log('  ✅ #2380 Verified: Share extension proxy upload and graceful enqueueing working.');

// -------------------------------------------------------------
// Test 4: MiniAppShareSheetGovernor (Resolves #2375)
// -------------------------------------------------------------
console.log('  Testing #2375: Mini App shareMessage Tall Preview Height Cap & Scrollability...');
const sheetGov = new MiniAppShareSheetGovernor();

const layout = sheetGov.calculateSheetLayout(
  { viewportWidth: 390, viewportHeight: 844, detent: 'large' },
  { title: 'Promo Card', previewHeightPx: 750, recipientCount: 50 }
);

// 40% of 844 is 337px. The 750px preview MUST be capped to 337px!
assert.equal(layout.actualPreviewHeightPx, 337);
assert.equal(layout.isScrollable, true);
assert.equal(layout.recipientSectionVisible, true);
assert.equal(layout.actionsBottomSticky, true);
console.log('  ✅ #2375 Verified: Mini App share sheet caps tall preview to prevent hiding recipients.');

// -------------------------------------------------------------
// Test 5: VideoNoteAudioRouteGovernor (Resolves #2365)
// -------------------------------------------------------------
console.log('  Testing #2365: Video Note Audio Route Recovery with Bluetooth Earbuds...');
const audioGov = new VideoNoteAudioRouteGovernor();

const recovery = audioGov.handleAudioRouteChange({
  previousPort: 'bluetoothSco',
  newPort: 'speaker',
  reason: 'oldDeviceUnavailable',
  bluetoothSampleRateMismatched: true
});

assert.equal(recovery.targetPort, 'builtInMic');
assert.equal(recovery.writerPreserved, true);
assert.ok(recovery.timestampSyncOffsetMs > 0);

const ptsSync = audioGov.resyncPresentationTimestamps(150, 90);
assert.equal(ptsSync.synced, true);
assert.equal(ptsSync.alignedAudioPts, 90, 'Must align audio PTS to video PTS on large drift');
console.log('  ✅ #2365 Verified: Audio route recovery and PTS alignment prevents recording termination.');

// -------------------------------------------------------------
// Test 6: IPadExternalMouseScrollGovernor (Resolves #2364)
// -------------------------------------------------------------
console.log('  Testing #2364: iPad External Mouse Scroll Event Routing...');
const mouseGov = new IPadExternalMouseScrollGovernor();

const decision = mouseGov.processPointerScrollEvent({
  pointerType: 'mouse',
  deltaX: 0,
  deltaY: -45,
  targetView: 'bubbleOverlay'
});

assert.equal(decision.allowSimultaneousRecognition, true);
assert.equal(decision.routedTarget, 'mainMessageList');
assert.equal(decision.scrollDeltaApplied, -45);
assert.equal(decision.preventBubbleActivation, true);
console.log('  ✅ #2364 Verified: Mouse scroll events correctly routed without bubble interference.');

// -------------------------------------------------------------
// Test 7: SpoilerRichTextLayoutGovernor (Resolves #2286)
// -------------------------------------------------------------
console.log('  Testing #2286: Spoiler Bounding Box Expansion for sup/sub Tags...');
const spoilerGov = new SpoilerRichTextLayoutGovernor();

const lineRect = { x: 20, y: 100, width: 250, height: 24 };
const entities = [
  { type: 'text', offset: 0, length: 5 },
  { type: 'superscript', offset: 5, length: 2, baselineShiftPx: 8 },
  { type: 'subscript', offset: 8, length: 2, baselineShiftPx: -6 },
  { type: 'spoiler', offset: 0, length: 12 }
];

const maskBounds = spoilerGov.calculateSpoilerBoundingBox(lineRect, entities);

// Top padding: 8 + 2 = 10px. y moves up by 10px (y: 90)
// Bottom padding: 6 + 2 = 8px. height becomes 24 + 10 + 8 = 42px
assert.equal(maskBounds.y, 90);
assert.equal(maskBounds.height, 42);
assert.equal(maskBounds.topPaddingApplied, 10);
assert.equal(maskBounds.bottomPaddingApplied, 8);
assert.equal(maskBounds.fullyEncapsulatesGlyphs, true);
console.log('  ✅ #2286 Verified: Spoiler bounding box fully encapsulates protruding sup/sub glyphs.');

console.log('\n🎉 ALL 7 TELEGRAM-IOS HARDENING TESTS PASSED WITH 100% SUCCESS!');
