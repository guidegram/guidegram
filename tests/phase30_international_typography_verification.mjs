import assert from 'node:assert/strict';
import { InternationalTypographyAndTextLayoutGuard } from '../src/services/internationalTypographyAndTextLayoutGuard.ts';

console.log('🧪 Starting Phase 30 International Typography & Text Layout Verification Suite...');

// 1. Composite Accents & Dead-Key Normalization (tdesktop #1041, #1360)
{
  console.log('  Testing composite accents & dead-key normalization...');
  // Decomposed Unicode: 'e' + combining acute (U+0301)
  const decomposed = 'e\u0301le\u0300ve';
  const precomposed = InternationalTypographyAndTextLayoutGuard.normalizeCompositeAccents(decomposed);
  assert.strictEqual(precomposed, 'élève');

  // Dead-key sequences: '´e' -> 'é', '`a' -> 'à'
  const deadKeyStr = 'caf´e `a la carte';
  const resolved = InternationalTypographyAndTextLayoutGuard.normalizeCompositeAccents(deadKeyStr);
  assert.strictEqual(resolved, 'café à la carte');
  console.log('  ✅ Composite accents normalization passed');
}

// 2. Multi-Script Font Cascade Ordering (tdesktop #5172, #25825, #7823)
{
  console.log('  Testing multi-script font cascade generator...');
  const windowsCascade = InternationalTypographyAndTextLayoutGuard.getOptimalFontFamilyCascade({
    osPlatform: 'windows'
  });
  assert.ok(windowsCascade.includes('Vazirmatn'));
  assert.ok(windowsCascade.includes('"Segoe UI"'));
  assert.ok(windowsCascade.includes('"Leelawadee UI"')); // Thai support

  const linuxCascade = InternationalTypographyAndTextLayoutGuard.getOptimalFontFamilyCascade({
    osPlatform: 'linux'
  });
  assert.ok(linuxCascade.includes('"Noto Sans Arabic"'));
  assert.ok(linuxCascade.includes('"Noto Sans Thai"'));
  console.log('  ✅ Font cascade generator passed');
}

// 3. Telegram "/me" Action Command Parser (tdesktop #1165)
{
  console.log('  Testing "/me <action>" command parsing...');
  const res1 = InternationalTypographyAndTextLayoutGuard.parseActionMessage('/me is coding in Antigravity', 'Ershad');
  assert.strictEqual(res1.isActionMessage, true);
  assert.strictEqual(res1.actionText, 'is coding in Antigravity');
  assert.strictEqual(res1.formattedDisplay, '* Ershad is coding in Antigravity');

  const res2 = InternationalTypographyAndTextLayoutGuard.parseActionMessage('Just a regular message', 'Ershad');
  assert.strictEqual(res2.isActionMessage, false);
  assert.strictEqual(res2.formattedDisplay, 'Just a regular message');
  console.log('  ✅ Action message parsing passed');
}

// 4. Granular Pinned Message Notification Filtering (tdesktop #1864)
{
  console.log('  Testing pinned message notification policy...');
  // Normal group: not muted -> notify
  assert.strictEqual(
    InternationalTypographyAndTextLayoutGuard.shouldNotifyForPinnedMessage({
      isGroupMuted: false,
      mutePinnedMessagesOnly: false,
      isMentioned: false
    }),
    true
  );

  // User specifically muted pinned messages -> do not notify
  assert.strictEqual(
    InternationalTypographyAndTextLayoutGuard.shouldNotifyForPinnedMessage({
      isGroupMuted: false,
      mutePinnedMessagesOnly: true,
      isMentioned: false
    }),
    false
  );

  // User muted pinned messages but was mentioned -> notify!
  assert.strictEqual(
    InternationalTypographyAndTextLayoutGuard.shouldNotifyForPinnedMessage({
      isGroupMuted: false,
      mutePinnedMessagesOnly: true,
      isMentioned: true
    }),
    true
  );
  console.log('  ✅ Pinned message notification policy passed');
}

console.log('\n🎉 ALL Phase 30 verification checks passed green!');
