import assert from 'node:assert';
import { TelegramFilenameSanitizer } from '../src/utils/telegramFilenameSanitizer.ts';

console.log('Testing TelegramFilenameSanitizer (telegraf #2101 Hardening)...');

const sanitizer = TelegramFilenameSanitizer.getInstance();

// 1. Double quote neutralization (telegraf #2101 exact scenario)
const quoteResult = sanitizer.sanitize('file_"foo"_bar.docx');
assert.strictEqual(quoteResult.hasQuotesOrInjections, true);
assert.strictEqual(quoteResult.sanitizedFilename, "file_'foo'_bar.docx");
assert.ok(!quoteResult.contentDispositionParam.includes('filename="file_"foo"_bar.docx"'), 'Unescaped quote must not be emitted in multipart header');
assert.ok(quoteResult.contentDispositionParam.includes("filename*=UTF-8''"), 'Quote-containing filename must include RFC 5987 encoded star parameter');

// 2. CRLF injection prevention
const crlfResult = sanitizer.sanitize('report\r\nContent-Type: image/jpeg\r\n.pdf');
assert.strictEqual(crlfResult.hasQuotesOrInjections, true);
assert.ok(!crlfResult.sanitizedFilename.includes('\r'), 'CR must be stripped');
assert.ok(!crlfResult.sanitizedFilename.includes('\n'), 'LF must be stripped');

// 3. Path traversal stripping
const pathResult = sanitizer.sanitize('../../../secrets/credentials.json');
assert.strictEqual(pathResult.sanitizedFilename, 'credentials.json');

// 4. Unicode Persian / Non-ASCII filename
const unicodeResult = sanitizer.sanitize('صورت‌حساب_پروژه_تلگرام.pdf');
assert.ok(unicodeResult.contentDispositionParam.includes("filename*=UTF-8''"), 'Non-ASCII names must produce RFC 5987 parameter');

// 5. Length clamping preserving extension
const superLongName = 'a'.repeat(300) + '.archive.tar.gz';
const clampedResult = sanitizer.sanitize(superLongName);
assert.ok(clampedResult.sanitizedFilename.length <= 255, 'Filename must be clamped to 255 bytes');
assert.ok(clampedResult.sanitizedFilename.endsWith('.tar.gz'), 'Extension must be preserved after clamping');

// 6. Fallback handling
const emptyResult = sanitizer.sanitize('');
assert.strictEqual(emptyResult.sanitizedFilename, 'document');

console.log('ALL 6 TELEGRAM FILENAME SANITIZER CHECKS PASSED SUCCESSFULLY!');
