import assert from 'node:assert';
import { DesktopPrivacyTelemetryFreeDesktopAndLocalizationGovernor } from '../src/services/desktopPrivacyTelemetryFreeDesktopAndLocalizationGovernor.ts';

console.log('=== Phase 129 Verification: Desktop Privacy, DC Telemetry & FreeDesktop Governor ===');

const governor = new DesktopPrivacyTelemetryFreeDesktopAndLocalizationGovernor();

// Test 1: Phone number masking in streamer privacy mode (#67)
{
  const maskedPartial = governor.getDisplayedPhoneNumber('+989123456789', {
    hidePhoneNumberInSettings: true,
    streamerModeActive: true,
    maskPhoneNumberPattern: 'partial_last_digits'
  });

  assert.strictEqual(maskedPartial, '+98 ••• ••• ••89');

  const maskedFull = governor.getDisplayedPhoneNumber('+989123456789', {
    hidePhoneNumberInSettings: true,
    streamerModeActive: false,
    maskPhoneNumberPattern: 'full_mask'
  });
  assert.strictEqual(maskedFull, '+•••••••••••');

  const unmasked = governor.getDisplayedPhoneNumber('+989123456789', {
    hidePhoneNumberInSettings: false,
    streamerModeActive: false,
    maskPhoneNumberPattern: 'partial_last_digits'
  });
  assert.strictEqual(unmasked, '+989123456789');
  console.log('Test 1 Passed: Streamer phone privacy masking verified.');
}

// Test 2: Media Viewer Data Center Telemetry Badge (#64)
{
  const dcInfo = governor.inspectMediaDcTelemetry({
    fileId: 'photo_high_res_999',
    dcId: 4,
    fileSizeBytes: 5242880, // 5 MB
    mimeType: 'image/jpeg'
  });

  assert.strictEqual(dcInfo.dcId, 4);
  assert.strictEqual(dcInfo.locationName, 'Amsterdam, NL');
  assert.strictEqual(dcInfo.formattedFileSize, '5.00 MB');
  assert.strictEqual(dcInfo.badgeText, 'DC 4 (Amsterdam, NL) • 5.00 MB');
  console.log('Test 2 Passed: Media DC telemetry inspection verified.');
}

// Test 3: FreeDesktop desktop entry key modernization (#46)
{
  const legacyDesktop = `[Desktop Entry]
Type=Application
Name=Guidegram
Exec=guidegram %u
X-GNOME-SingleWindow=true
Icon=guidegram
`;

  const result = governor.modernizeDesktopEntry(legacyDesktop);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.migratedKeys['X-GNOME-SingleWindow'], 'SingleMainWindow');
  assert.ok(result.sanitizedDesktopFileContent.includes('SingleMainWindow=true'));
  assert.ok(!result.sanitizedDesktopFileContent.includes('X-GNOME-SingleWindow'));
  console.log('Test 3 Passed: FreeDesktop X-GNOME-SingleWindow migration verified.');
}

// Test 4: Persian pluralization and ZWNJ handling (#78, #24, #13)
{
  const faSingle = governor.formatPluralizedString('fa', 'unread_messages', 1);
  assert.strictEqual(faSingle, '۱ پیام خوانده‌نشده');

  const faMultiple = governor.formatPluralizedString('fa', 'unread_messages', 5);
  assert.strictEqual(faMultiple, '5 پیام خوانده‌نشده');
  console.log('Test 4 Passed: Persian pluralization verified.');
}

// Test 5: Russian Slavic pluralization rules (#78, #24)
{
  const ru1 = governor.formatPluralizedString('ru', 'unread_messages', 1);
  assert.strictEqual(ru1, '1 непрочитанное сообщение');

  const ru3 = governor.formatPluralizedString('ru', 'unread_messages', 3);
  assert.strictEqual(ru3, '3 непрочитанных сообщения');

  const ru5 = governor.formatPluralizedString('ru', 'unread_messages', 5);
  assert.strictEqual(ru5, '5 непрочитанных сообщений');
  console.log('Test 5 Passed: Russian pluralization forms verified.');
}

// Test 6: English standard pluralization
{
  const en1 = governor.formatPluralizedString('en', 'unread_messages', 1);
  assert.strictEqual(en1, '1 unread message');

  const en10 = governor.formatPluralizedString('en', 'unread_messages', 10);
  assert.strictEqual(en10, '10 unread messages');
  console.log('Test 6 Passed: English pluralization verified.');
}

// Test 7: Media DC 5 (Singapore) Telemetry
{
  const dc5 = governor.inspectMediaDcTelemetry({
    fileId: 'video_file_123',
    dcId: 5,
    fileSizeBytes: 20971520, // 20 MB
    mimeType: 'video/mp4'
  });

  assert.strictEqual(dc5.dcId, 5);
  assert.strictEqual(dc5.locationName, 'Singapore, SG');
  assert.strictEqual(dc5.formattedFileSize, '20.00 MB');
  console.log('Test 7 Passed: Singapore DC 5 telemetry verified.');
}

console.log('=== ALL PHASE 129 TESTS PASSED (100% HEALTH) ===');
