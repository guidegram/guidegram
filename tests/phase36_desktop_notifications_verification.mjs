import assert from 'node:assert/strict';
import { DesktopNotificationsAndMediaStreamGovernor } from '../src/services/desktopNotificationsAndMediaStreamGovernor.ts';

console.log('🧪 Starting Phase 36 Desktop Notifications & Media Stream Verification Suite...');

// 1. Native Desktop Notification Formatting (tdesktop #91, #3831)
{
  console.log('  Testing native notification payload formatting...');
  const payload = DesktopNotificationsAndMediaStreamGovernor.formatNativeNotification(
    'Dev Team',
    'Ershad',
    'Feature phase completed successfully and ready for deployment',
    1001,
    'https://example.com/avatar.jpg',
    false
  );

  assert.strictEqual(payload.title, 'Ershad (Dev Team)');
  assert.strictEqual(payload.silent, false);
  assert.strictEqual(payload.tag, 'chat_1001');
  assert.strictEqual(payload.actions.length, 2);
  assert.strictEqual(payload.actions[0].action, 'reply');

  // Direct 1-on-1 message title
  const directPayload = DesktopNotificationsAndMediaStreamGovernor.formatNativeNotification(
    'Sara',
    'Sara',
    'Hello',
    2002
  );
  assert.strictEqual(directPayload.title, 'Sara');
  console.log('  ✅ Native notification formatting passed');
}

// 2. Dock & Taskbar Unread Launcher Badge (tdesktop #10407)
{
  console.log('  Testing launcher badge calculation...');
  const badge1 = DesktopNotificationsAndMediaStreamGovernor.computeLauncherBadge(5, 10);
  assert.strictEqual(badge1.count, 15);
  assert.strictEqual(badge1.badgeLabel, '15');
  assert.strictEqual(badge1.hasUnmuted, true);

  // Large counts
  const badgeHuge = DesktopNotificationsAndMediaStreamGovernor.computeLauncherBadge(1500, 200);
  assert.strictEqual(badgeHuge.badgeLabel, '999+');

  // Zero unread
  const badgeZero = DesktopNotificationsAndMediaStreamGovernor.computeLauncherBadge(0, 0);
  assert.strictEqual(badgeZero.badgeLabel, '');
  assert.strictEqual(badgeZero.hasUnmuted, false);
  console.log('  ✅ Launcher badge calculation passed');
}

// 3. High-Quality WebRTC Screen Share Constraints (tdesktop #16487)
{
  console.log('  Testing WebRTC screen sharing constraints...');
  // 60fps high framerate stream
  const motionProfile = DesktopNotificationsAndMediaStreamGovernor.getScreenShareConstraints({
    contentHint: 'motion',
    prefersHighFramerate: true,
    maxResolutionWidth: 1920,
    maxResolutionHeight: 1080
  });
  assert.strictEqual(motionProfile.video.frameRate.ideal, 60);
  assert.strictEqual(motionProfile.video.width.ideal, 1920);

  // 30fps presentation stream
  const textProfile = DesktopNotificationsAndMediaStreamGovernor.getScreenShareConstraints({
    contentHint: 'text',
    prefersHighFramerate: false,
    maxResolutionWidth: 2560,
    maxResolutionHeight: 1440
  });
  assert.strictEqual(textProfile.video.frameRate.ideal, 30);
  assert.strictEqual(textProfile.video.width.ideal, 2560);
  console.log('  ✅ Screen share constraints passed');
}

// 4. Custom Icon Path Resolution (tdesktop #7192, #3830)
{
  console.log('  Testing application icon path resolution...');
  const customSvg = DesktopNotificationsAndMediaStreamGovernor.resolveAppIconPath('/opt/icons/custom.svg');
  assert.strictEqual(customSvg.selectedPath, '/opt/icons/custom.svg');
  assert.strictEqual(customSvg.isCustom, true);

  const invalidIcon = DesktopNotificationsAndMediaStreamGovernor.resolveAppIconPath('corrupt_path.txt');
  assert.strictEqual(invalidIcon.selectedPath, 'assets/icons/guidegram.png');
  assert.strictEqual(invalidIcon.isCustom, false);
  console.log('  ✅ Icon path resolution passed');
}

console.log('\n🎉 ALL Phase 36 verification checks passed green!');
