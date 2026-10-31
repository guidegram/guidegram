import assert from 'node:assert';
import { DesktopMobileLinuxFolderSearchAndLayoutGovernor } from '../src/services/desktopMobileLinuxFolderSearchAndLayoutGovernor.ts';

console.log('=== Phase 125 Verification: Desktop Mobile-Linux, Folder Search & Layout Governor ===');

const governor = new DesktopMobileLinuxFolderSearchAndLayoutGovernor();

// Test 1: Anonymous Forwarding without Authorship & Link Stripping (#233)
{
  const result = governor.prepareForwardedMessage({
    messageId: 101,
    originalSenderId: 999,
    originalSenderName: 'Alice Secret',
    forwardOriginType: 'user',
    text: 'Check this link https://secret.corp/leak and keep it quiet',
    hasMedia: true,
    mediaCaption: 'Photo caption with https://phishing.site',
    mediaUrls: ['file://image.jpg']
  }, {
    dropAuthor: true,
    stripExternalLinks: true
  });

  assert.strictEqual(result.hasForwardHeader, false);
  assert.strictEqual(result.forwardOriginHeader, undefined);
  assert.strictEqual(result.forwardedText, 'Check this link [link removed] and keep it quiet');
  assert.strictEqual(result.sanitizedCaption, 'Photo caption with [link removed]');
  console.log('Test 1 Passed: Anonymous forwarding & external link stripping verified.');
}

// Test 2: Standard Forwarding retaining Authorship (#233)
{
  const result = governor.prepareForwardedMessage({
    messageId: 102,
    originalSenderId: 888,
    originalSenderName: 'Bob Channel',
    forwardOriginType: 'channel',
    text: 'Public Announcement',
    hasMedia: false
  }, {
    dropAuthor: false
  });

  assert.strictEqual(result.hasForwardHeader, true);
  assert.strictEqual(result.forwardOriginHeader, 'Forwarded from Bob Channel');
  console.log('Test 2 Passed: Standard forwarding header retention verified.');
}

// Test 3: Folder-Scoped Search Filtering (#204)
{
  const messages = [
    { id: 1, chatId: 10, text: 'Deploy update tonight', senderName: 'DevOps', timestamp: 1000 },
    { id: 2, chatId: 20, text: 'Family dinner tonight', senderName: 'Mom', timestamp: 1001 },
    { id: 3, chatId: 30, text: 'Deploy invoice report', senderName: 'Accountant', timestamp: 1002 },
    { id: 4, chatId: 10, text: 'Cancel the meeting', senderName: 'Boss', timestamp: 1003 }
  ];

  // Search "deploy" in Work folder (includes chats 10, 30; excludes 20)
  const results = governor.searchWithinFolder(messages, {
    folderId: 'work-folder',
    includedChatIds: [10, 30],
    excludedChatIds: [20],
    query: 'deploy'
  });

  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].id, 1);
  assert.strictEqual(results[1].id, 3);
  console.log('Test 3 Passed: Folder-scoped message search filter verified.');
}

// Test 4: Keyboard Layout Transliteration (English to Persian & Russian) (#137)
{
  // Persian typo: "sghl" -> "سلام"
  const faTrans = governor.transliterateMisplacedLayout('sghl', 'fa');
  assert.strictEqual(faTrans, 'سلام');

  // Russian typo: "ghbdtn" -> "привет"
  const ruTrans = governor.transliterateMisplacedLayout('ghbdtn', 'ru');
  assert.strictEqual(ruTrans, 'привет');
  console.log('Test 4 Passed: Keyboard layout transliteration fixer verified.');
}

// Test 5: Linux Mobile (PinePhone/Librem 5) Layout Configuration (#451)
{
  const mobileConfig = governor.configureLinuxMobileLayout({
    screenWidth: 720,
    screenHeight: 1440,
    isTouchDevice: true,
    orientation: 'portrait'
  });

  assert.strictEqual(mobileConfig.isMobileLayoutActive, true);
  assert.strictEqual(mobileConfig.drawerNavigationEnabled, true);
  assert.strictEqual(mobileConfig.touchTargetPaddingPx, 16);
  assert.strictEqual(mobileConfig.messageListMaxColumns, 1);

  const desktopConfig = governor.configureLinuxMobileLayout({
    screenWidth: 1920,
    screenHeight: 1080,
    isTouchDevice: false,
    orientation: 'landscape'
  });

  assert.strictEqual(desktopConfig.isMobileLayoutActive, false);
  assert.strictEqual(desktopConfig.touchTargetPaddingPx, 8);
  console.log('Test 5 Passed: Linux Mobile viewport responsiveness verified.');
}

// Test 6: AppImage & Chocolatey Distribution Package Manifests (#228, #48)
{
  const appImage = governor.generateDistributionPackageManifest('appimage', '5.14.3');
  assert.strictEqual(appImage.filename, 'guidegram.desktop');
  assert.ok(appImage.content.includes('X-AppImage-Version=5.14.3'));

  const choco = governor.generateDistributionPackageManifest('chocolatey', '5.14.3');
  assert.strictEqual(choco.filename, 'guidegram.nuspec');
  assert.ok(choco.content.includes('<version>5.14.3</version>'));
  console.log('Test 6 Passed: AppImage and Chocolatey distribution manifests verified.');
}

// Test 7: Linux Download Destination Chooser (#449)
{
  const withPortal = governor.resolveLinuxDownloadDestination('/home/user', true);
  assert.strictEqual(withPortal.destinationPath, 'xdg-desktop-portal:SaveFile');
  assert.strictEqual(withPortal.portalUsed, true);

  const withoutPortal = governor.resolveLinuxDownloadDestination('/home/user', false);
  assert.strictEqual(withoutPortal.destinationPath, '/home/user/Downloads');
  assert.strictEqual(withoutPortal.portalUsed, false);
  console.log('Test 7 Passed: Linux XDG portal & fallback download paths verified.');
}

console.log('=== ALL PHASE 125 TESTS PASSED (100% HEALTH) ===');
