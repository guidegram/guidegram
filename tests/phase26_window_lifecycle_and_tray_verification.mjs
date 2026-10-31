import assert from 'node:assert/strict';
import { WindowLifecycleAndTrayGovernor } from '../src/services/windowLifecycleAndTrayGovernor.ts';

console.log('🧪 Starting Phase 26 Window Lifecycle, Multi-Window & Tray Verification Suite...');

// 1. Off-screen Window Bounds Sanitization (tdesktop #1189)
{
  console.log('  Testing window bounds sanitization...');
  const displays = [
    { x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1 }
  ];

  // Window was saved at disconnected external monitor (x: 2500, y: 500)
  const deadZoneBounds = { x: 2500, y: 500, width: 800, height: 600 };
  const sanitized = WindowLifecycleAndTrayGovernor.sanitizeWindowBounds(deadZoneBounds, displays);

  assert.ok(sanitized.x >= 0 && sanitized.x < 1920, 'Window must be recentered within primary display');
  assert.ok(sanitized.y >= 0 && sanitized.y < 1080, 'Window Y must be within primary display');
  assert.strictEqual(sanitized.width, 800);
  assert.strictEqual(sanitized.height, 600);

  // Normal valid bounds preserved
  const validBounds = { x: 200, y: 150, width: 1000, height: 700 };
  const preserved = WindowLifecycleAndTrayGovernor.sanitizeWindowBounds(validBounds, displays);
  assert.strictEqual(preserved.x, 200);
  assert.strictEqual(preserved.y, 150);
  console.log('  ✅ Window bounds sanitization passed');
}

// 2. Secondary Window Bounds & Isolation (tdesktop #31545)
{
  console.log('  Testing secondary window isolation...');
  const mainBounds = { x: 100, y: 100, width: 1200, height: 800 };
  const requestedStickerPicker = { x: 950, y: 200, width: 450, height: 600 };
  const display = { x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1 };

  const result = WindowLifecycleAndTrayGovernor.isolateSecondaryWindowBounds(
    mainBounds,
    requestedStickerPicker,
    display
  );

  // Main window bounds must remain 100% untouched
  assert.deepStrictEqual(result.safeMainWindowBounds, mainBounds);
  assert.strictEqual(result.isolatedSecondaryBounds.width, 450);
  assert.strictEqual(result.isolatedSecondaryBounds.height, 600);
  console.log('  ✅ Secondary window isolation passed');
}

// 3. High-DPI Theme-Adaptive Tray Icon (tdesktop #10556, #1908, #2230)
{
  console.log('  Testing theme-adaptive high-DPI tray icon generation...');
  // Dark taskbar (Windows 11 / KDE dark) -> White icon (#FFFFFF)
  const darkTaskbarIcon = WindowLifecycleAndTrayGovernor.generateTrayIconDescriptor({
    theme: 'auto',
    systemIsDark: true,
    unreadCount: 5,
    hasMutedUnread: false,
    scaleFactor: 2 // 200% scaling
  });

  assert.strictEqual(darkTaskbarIcon.baseColor, '#FFFFFF');
  assert.strictEqual(darkTaskbarIcon.badgeColor, '#3390EC');
  assert.strictEqual(darkTaskbarIcon.sizePx, 32); // 16 * 2
  assert.strictEqual(darkTaskbarIcon.ariaLabel, 'Guidegram - 5 unread messages');

  // Light taskbar -> Obsidian icon (#1A1A1A) with muted badge
  const lightTaskbarIcon = WindowLifecycleAndTrayGovernor.generateTrayIconDescriptor({
    theme: 'light',
    systemIsDark: false,
    unreadCount: 120,
    hasMutedUnread: true,
    scaleFactor: 1.5
  });

  assert.strictEqual(lightTaskbarIcon.baseColor, '#1A1A1A');
  assert.strictEqual(lightTaskbarIcon.badgeColor, '#8E8E93');
  assert.strictEqual(lightTaskbarIcon.sizePx, 24); // 16 * 1.5
  assert.strictEqual(lightTaskbarIcon.ariaLabel, 'Guidegram - 99+ unread messages');
  console.log('  ✅ High-DPI theme-adaptive tray icon passed');
}

// 4. Window Close Action Resolution (tdesktop #139, #1401)
{
  console.log('  Testing window close action resolution...');
  assert.strictEqual(
    WindowLifecycleAndTrayGovernor.resolveWindowCloseAction(true, true, false),
    'hide-to-tray'
  );
  assert.strictEqual(
    WindowLifecycleAndTrayGovernor.resolveWindowCloseAction(false, true, false),
    'quit'
  );
  // Active call overrides close action to prevent dropped calls
  assert.strictEqual(
    WindowLifecycleAndTrayGovernor.resolveWindowCloseAction(false, true, true),
    'minimize-to-tray'
  );
  console.log('  ✅ Window close action resolution passed');
}

// 5. Media Viewer Presentation Mode (tdesktop #31520, #2958)
{
  console.log('  Testing media viewer presentation mode...');
  const maximized = WindowLifecycleAndTrayGovernor.calculateMediaViewerDisplayMode(false, true);
  assert.strictEqual(maximized.mode, 'maximized');
  assert.strictEqual(maximized.decorationsVisible, true);
  assert.strictEqual(maximized.taskbarVisible, true);

  const fullscreen = WindowLifecycleAndTrayGovernor.calculateMediaViewerDisplayMode(true, true);
  assert.strictEqual(fullscreen.mode, 'fullscreen');
  assert.strictEqual(fullscreen.decorationsVisible, false);
  assert.strictEqual(fullscreen.taskbarVisible, false);
  console.log('  ✅ Media viewer presentation mode passed');
}

console.log('\n🎉 ALL Phase 26 verification checks passed green!');
