import assert from 'node:assert';
import { DesktopTypographyBulkReadCallPrivacyAndReleaseGovernor } from '../src/services/desktopTypographyBulkReadCallPrivacyAndReleaseGovernor.ts';

console.log('=== Phase 126 Verification: Desktop Typography, Bulk Read & Call Privacy Governor ===');

const governor = new DesktopTypographyBulkReadCallPrivacyAndReleaseGovernor();

// Test 1: Typography Styles & Font Fallback Chain (#432, #217)
{
  const typo = governor.generateTypographyStyles({
    primaryFontFamily: 'Vazirmatn',
    fallbackFontFamilies: ['Inter', 'Segoe UI'],
    fontSizeScale: 1.2,
    fontWeight: 'medium',
    useSystemFontMetrics: true
  });

  assert.strictEqual(typo.fontFamilyCss, 'font-family: Vazirmatn, Inter, "Segoe UI", sans-serif;');
  assert.strictEqual(typo.fontScaleStyle, 'font-size: 17px; line-height: 24px;');
  assert.strictEqual(typo.fontWeights.current, 500);
  console.log('Test 1 Passed: Custom typography & font fallback chain verified.');
}

// Test 2: Bulk "Mark All As Read" for Channels Only (#169)
{
  const chats = [
    { chatId: 1, chatType: 'channel', unreadCount: 15, lastReadInboxMessageId: 10, maxMessageId: 25 },
    { chatId: 2, chatType: 'direct', unreadCount: 3, lastReadInboxMessageId: 5, maxMessageId: 8 },
    { chatId: 3, chatType: 'channel', unreadCount: 40, lastReadInboxMessageId: 100, maxMessageId: 140 },
    { chatId: 4, chatType: 'group', unreadCount: 7, lastReadInboxMessageId: 20, maxMessageId: 27 }
  ];

  const result = governor.markAllAsRead(chats, {
    scope: 'channels_only'
  });

  assert.strictEqual(result.chatsUpdatedCount, 2);
  assert.strictEqual(result.totalMessagesMarkedRead, 55);
  assert.deepStrictEqual(result.updatedChatIds, [1, 3]);
  assert.strictEqual(chats[0].unreadCount, 0);
  assert.strictEqual(chats[1].unreadCount, 3); // Untouched direct chat
  console.log('Test 2 Passed: Bulk mark all as read for channels only verified.');
}

// Test 3: Bulk "Mark All As Read" Folder Scoped (#169)
{
  const chats = [
    { chatId: 10, chatType: 'channel', folderId: 'f1', unreadCount: 5, lastReadInboxMessageId: 1, maxMessageId: 6 },
    { chatId: 20, chatType: 'group', folderId: 'f2', unreadCount: 12, lastReadInboxMessageId: 1, maxMessageId: 13 },
    { chatId: 30, chatType: 'direct', folderId: 'f1', unreadCount: 8, lastReadInboxMessageId: 1, maxMessageId: 9 }
  ];

  const result = governor.markAllAsRead(chats, {
    scope: 'folder_scoped',
    targetFolderId: 'f1'
  });

  assert.strictEqual(result.chatsUpdatedCount, 2);
  assert.strictEqual(result.totalMessagesMarkedRead, 13);
  assert.deepStrictEqual(result.updatedChatIds, [10, 30]);
  console.log('Test 3 Passed: Bulk mark as read in folder scope verified.');
}

// Test 4: Incoming Call Window Popup Disruption Control (#45)
{
  // User disabled intrusive popup, requests subtle banner
  const bannerDispatch = governor.dispatchIncomingCallUI({
    callId: 'call-1',
    callerId: 1234,
    callerName: 'Charlie',
    isCallerContact: true,
    isSystemDNDActive: false
  }, {
    allowIntrusiveWindowPopup: false,
    displayMode: 'subtle_banner',
    dndSuppressionEnabled: true,
    ringtoneVolume: 0.5
  });

  assert.strictEqual(bannerDispatch.action, 'show_subtle_banner');
  assert.strictEqual(bannerDispatch.ringtoneMuted, false);

  // DND active call suppression
  const dndDispatch = governor.dispatchIncomingCallUI({
    callId: 'call-2',
    callerId: 5678,
    callerName: 'Spammer',
    isCallerContact: false,
    isSystemDNDActive: true
  }, {
    allowIntrusiveWindowPopup: true,
    displayMode: 'full_screen_window',
    dndSuppressionEnabled: true,
    ringtoneVolume: 1.0
  });

  assert.strictEqual(dndDispatch.action, 'rejected_dnd');
  assert.strictEqual(dndDispatch.ringtoneMuted, true);
  console.log('Test 4 Passed: Incoming call disruption & DND suppression verified.');
}

// Test 5: Package SemVer Normalization for Linux ebuilds (#70)
{
  assert.strictEqual(governor.normalizePackageVersion('1.3.6-full'), '1.3.6');
  assert.strictEqual(governor.normalizePackageVersion('1.3.6.0-beta'), '1.3.6');
  assert.strictEqual(governor.normalizePackageVersion('5.14.3'), '5.14.3');
  console.log('Test 5 Passed: Package SemVer normalization verified.');
}

// Test 6: Release Channel Telemetry & Check (#457)
{
  const telemetry = governor.checkReleaseTelemetry('1.3.6', 'stable');
  assert.strictEqual(telemetry.isUpdateAvailable, true);
  assert.strictEqual(telemetry.latestVersion, '5.14.3');
  console.log('Test 6 Passed: Release channel telemetry verified.');
}

// Test 7: MTProto Constructor ID Inspection (#271)
{
  const schema = governor.inspectMTProtoSchema(0x761450c3);
  assert.ok(schema !== null);
  assert.strictEqual(schema.typeName, 'message');
  assert.strictEqual(schema.layer, 198);
  assert.ok(schema.fields.includes('peer_id:Peer'));
  console.log('Test 7 Passed: MTProto dev schema inspection verified.');
}

console.log('=== ALL PHASE 126 TESTS PASSED (100% HEALTH) ===');
