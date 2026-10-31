import assert from 'node:assert';
import { DesktopScreenshotLocationRegistryAndAccountLimitGovernor } from '../src/services/desktopScreenshotLocationRegistryAndAccountLimitGovernor.ts';

console.log('=== Phase 132 Verification: Desktop Screenshot, Location & Registry Governor ===');

const governor = new DesktopScreenshotLocationRegistryAndAccountLimitGovernor();

// Test 1: Desktop Screen Area Capture & Clamping (#216)
{
  const result = governor.processScreenCapture(
    { x: 100, y: 150, width: 800, height: 600 },
    1920,
    1080
  );

  assert.strictEqual(result.croppedDimensions.width, 800);
  assert.strictEqual(result.croppedDimensions.height, 600);
  assert.strictEqual(result.mimeType, 'image/png');
  assert.ok(result.fileSizeBytes > 10000);

  // Clamping test (out-of-bounds rect)
  const clamped = governor.processScreenCapture(
    { x: 1800, y: 1000, width: 500, height: 500 },
    1920,
    1080
  );
  assert.strictEqual(clamped.croppedDimensions.width, 120); // 1920 - 1800
  assert.strictEqual(clamped.croppedDimensions.height, 80);  // 1080 - 1000
  console.log('Test 1 Passed: Screenshot cropping and screen bounds clamping verified.');
}

// Test 2: Geo Location Map View Model & Tile Computation (#215)
{
  const map = governor.buildGeoMapModel({
    latitude: 35.6892,
    longitude: 51.3890,
    isLiveLocation: true,
    expiresTimestamp: Date.now() + 600000 // 10 mins in future
  });

  assert.strictEqual(map.formattedCoordinates, '35.689200, 51.389000');
  assert.strictEqual(map.isLiveActive, true);
  assert.ok(map.interactiveOsmTileUrl.includes('tile.openstreetmap.org/16/'));
  assert.ok(map.externalMapUrl.includes('mlat=35.6892'));
  console.log('Test 2 Passed: Geo-location OpenStreetMap tile model verified.');
}

// Test 3: Account Limits - Free Tier (3 Accounts Cap) (#208)
{
  const evalCanAdd = governor.evaluateAccountLimits(2, false);
  assert.strictEqual(evalCanAdd.maxAllowedAccounts, 3);
  assert.strictEqual(evalCanAdd.canAddMoreAccounts, true);
  assert.strictEqual(evalCanAdd.upgradePromptMessage, undefined);

  const evalLimitReached = governor.evaluateAccountLimits(3, false);
  assert.strictEqual(evalLimitReached.canAddMoreAccounts, false);
  assert.ok(evalLimitReached.upgradePromptMessage?.includes('maximum limit of 3 accounts for free users'));
  console.log('Test 3 Passed: Free tier 3-account limit evaluation verified.');
}

// Test 4: Account Limits - Premium Tier (6 Accounts Cap) (#208)
{
  const evalPremiumCanAdd = governor.evaluateAccountLimits(5, true);
  assert.strictEqual(evalPremiumCanAdd.maxAllowedAccounts, 6);
  assert.strictEqual(evalPremiumCanAdd.canAddMoreAccounts, true);

  const evalPremiumLimitReached = governor.evaluateAccountLimits(6, true);
  assert.strictEqual(evalPremiumLimitReached.canAddMoreAccounts, false);
  assert.ok(evalPremiumLimitReached.upgradePromptMessage?.includes('maximum capacity of 6 accounts'));
  console.log('Test 4 Passed: Premium tier 6-account capacity verified.');
}

// Test 5: Windows Registry Autostart & Shortcut Spec (#217, #214)
{
  const regSpec = governor.generateWindowsRegistrySpec('C:/Program Files/Guidegram/guidegram.exe', true);
  assert.strictEqual(regSpec.regKeyPath, 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run');
  assert.strictEqual(regSpec.regValueName, 'Guidegram');
  assert.strictEqual(regSpec.regValueData, '"C:\\Program Files\\Guidegram\\guidegram.exe" -autostart');
  assert.ok(regSpec.shortcutCommand.includes('Desktop'));
  console.log('Test 5 Passed: Windows registry autostart specification verified.');
}

// Test 6: Pasted Text Normalization (#207)
{
  const rawPasted = 'First line with trailing spaces    \nSecond line   \n\nThird line  ';
  const normalized = governor.normalizePastedText(rawPasted);
  assert.strictEqual(normalized, 'First line with trailing spaces\nSecond line\n\nThird line');
  console.log('Test 6 Passed: Pasted text trailing whitespace cleanup verified.');
}

// Test 7: Expired Live Location Check
{
  const expiredMap = governor.buildGeoMapModel({
    latitude: 40.7128,
    longitude: -74.0060,
    isLiveLocation: true,
    expiresTimestamp: Date.now() - 1000 // Expired in past
  });
  assert.strictEqual(expiredMap.isLiveActive, false);
  console.log('Test 7 Passed: Expired live location status verified.');
}

console.log('=== ALL PHASE 132 TESTS PASSED (100% HEALTH) ===');
