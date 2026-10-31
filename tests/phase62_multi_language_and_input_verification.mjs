import assert from 'node:assert/strict';
import { MultiLanguageAndInputGovernor } from '../src/services/multiLanguageAndInputGovernor.ts';

console.log('🧪 Starting Phase 62 Multi-Language & International Input Verification Suite...');

const governor = new MultiLanguageAndInputGovernor();

// 1. IME Composition State Gating (telegramdesktop/tdesktop #2013)
console.log('  Testing IME composition state gating on Enter key...');
assert.equal(governor.shouldSuppressMessageSendOnEnter({ key: 'Enter', isComposing: false }), false);

governor.handleCompositionStart();
governor.handleCompositionUpdate('とうきょう');
assert.equal(governor.shouldSuppressMessageSendOnEnter({ key: 'Enter', isComposing: true }), true);
assert.equal(governor.shouldSuppressMessageSendOnEnter({ key: 'Enter' }), true);

governor.handleCompositionEnd();
assert.equal(governor.shouldSuppressMessageSendOnEnter({ key: 'Enter', isComposing: false }), false);
console.log('  ✅ IME composition state gating verified');

// 2. Combining Diacritics Preservation (telegramdesktop/tdesktop #6362)
console.log('  Testing combining diacritics & harakat preservation...');
// Persian text with Tashkeel: "مُحَمَّد" (Damma, Fatha, Shadda)
const arabicText = 'مُحَمَّد';
const normalized = governor.normalizePreservingDiacritics(arabicText);
assert.equal(normalized, arabicText, 'Diacritics must be preserved under normalization');
assert.ok(normalized.includes('\u064F'), 'Damma diacritic must remain intact');
assert.ok(normalized.includes('\u0651'), 'Shadda diacritic must remain intact');
console.log('  ✅ Combining diacritics preservation verified');

// 3. BiDi Directional Formatting (telegramdesktop/tdesktop #9922)
console.log('  Testing BiDi directional isolate insertion for mixed Persian & English...');
const mixedText = 'سلام به تیم Guidegram و کانال @guidegram_app خوش آمدید!';
const formattedBidi = governor.formatBidiText(mixedText, 'rtl');

// In RTL context, English tokens must be wrapped with \u2066 (LRI) and \u2069 (PDI)
assert.ok(formattedBidi.includes('\u2066Guidegram\u2069'), 'Latin words must be wrapped in LRI/PDI isolates');
assert.ok(formattedBidi.includes('\u2066@guidegram_app\u2069'), 'Usernames must be wrapped in LRI/PDI isolates');
console.log('  ✅ BiDi directional formatting verified');

// 4. CJK Pangu Spacing (TDesktop-x64/tdesktop #246)
console.log('  Testing CJK/Latin pangu typographic spacing...');
const unspaced = '使用Guidegram进行2026年聊天';
const spaced = governor.applyPanguSpacing(unspaced);
assert.equal(spaced, '使用 Guidegram 进行 2026 年聊天');
console.log('  ✅ CJK/Latin pangu spacing verified');

// 5. Multi-Script Font Stack (UnigramDev/Unigram #1841)
console.log('  Testing multi-script font fallback stack...');
const fontStack = governor.getMultiScriptFontStack('Vazirmatn');
assert.ok(fontStack.includes('"Vazirmatn"'));
assert.ok(fontStack.includes('"Noto Sans CJK SC"'));
assert.ok(fontStack.includes('"Noto Sans Arabic"'));
assert.ok(fontStack.includes('"Apple Color Emoji"'));
console.log('  ✅ Multi-script font stack verified');

// 6. Dynamic Language Pack Cache Invalidation (morethanwords/tweb #743)
console.log('  Testing dynamic language pack cache invalidation...');
const initial = governor.updateLanguagePack('fa', 1, 'hash_v1', { welcome: 'خوش آمدید' });
assert.equal(initial.invalidated, true);
assert.equal(governor.getLanguageString('fa', 'welcome'), 'خوش آمدید');

// Same version and hash -> no invalidation
const same = governor.updateLanguagePack('fa', 1, 'hash_v1', { welcome: 'خوش آمدید' });
assert.equal(same.invalidated, false);

// Remote update with higher version -> invalidation triggered automatically
const updated = governor.updateLanguagePack('fa', 2, 'hash_v2', { welcome: 'درود، خوش آمدید' });
assert.equal(updated.invalidated, true);
assert.equal(governor.getLanguageString('fa', 'welcome'), 'درود، خوش آمدید');
console.log('  ✅ Dynamic language pack cache invalidation verified');

console.log('✨ All Phase 62 Verification Tests Passed 100% Successfully!');
