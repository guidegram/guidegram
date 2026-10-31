import assert from 'node:assert';
import {
  inspectInputSource,
  parseContentDispositionFilename,
  extractUrlBasename,
  prepareFetchForInputSource
} from '../src/utils/telegramInputSourceResolver.ts';

console.log('Testing TelegramInputSourceResolver (grammY #979 Hardening)...');

// 1. Test Content-Disposition Filename Parsing
const standardHeader = 'attachment; filename="presentation_final.pdf"';
assert.strictEqual(parseContentDispositionFilename(standardHeader), 'presentation_final.pdf');

const rfc5987Header = "attachment; filename*=utf-8''%D8%B1%D8%A7%D9%87%D9%86%D9%85%D8%A7.pdf";
assert.strictEqual(parseContentDispositionFilename(rfc5987Header), 'راهنما.pdf');

// 2. Test URL Basename Extraction
assert.strictEqual(extractUrlBasename('https://cdn.example.com/assets/images/logo.png?v=2'), 'logo.png');
assert.strictEqual(extractUrlBasename('https://cdn.example.com/'), undefined);

// 3. Test Web Standard Request Handling (Preserving Auth Headers)
const req = new Request('https://api.example.com/protected/document.docx', {
  headers: {
    'Authorization': 'Bearer secret_access_token_123',
    'X-Custom-Tenant': 'tenant_abc'
  }
});

const reqMeta = inspectInputSource(req);
assert.strictEqual(reqMeta.sourceType, 'request', 'Web Request must be classified as request, NOT downcast to URL');
assert.strictEqual(reqMeta.hasCustomHeaders, true);
assert.strictEqual(reqMeta.headers?.authorization, 'Bearer secret_access_token_123');
assert.strictEqual(reqMeta.filename, 'document.docx');

// 4. Test Web Standard Response with Content-Disposition
const res = new Response('dummy binary content', {
  status: 200,
  headers: {
    'content-disposition': 'attachment; filename="server_report.xlsx"',
    'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
});

const resMeta = inspectInputSource(res);
assert.strictEqual(resMeta.sourceType, 'response');
assert.strictEqual(resMeta.filename, 'server_report.xlsx');
assert.strictEqual(resMeta.mimeType, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

// 5. Test CustomUrlSource (URLLike with Headers)
const customSource = {
  url: 'https://s3.amazonaws.com/bucket/data.tar.gz',
  headers: { 'x-amz-security-token': 'token_xyz' }
};

const customMeta = inspectInputSource(customSource);
assert.strictEqual(customMeta.sourceType, 'url');
assert.strictEqual(customMeta.filename, 'data.tar.gz');
assert.strictEqual(customMeta.hasCustomHeaders, true);
assert.strictEqual(customMeta.headers?.['x-amz-security-token'], 'token_xyz');

// 6. Test Binary Uint8Array
const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
const binMeta = inspectInputSource(uint8);
assert.strictEqual(binMeta.sourceType, 'binary');

// 7. Test prepareFetchForInputSource with Request Passthrough
let passedFetchInput = null;
const mockFetch = async (input, init) => {
  passedFetchInput = input;
  return new Response('stream bytes', { status: 200 });
};

const prepared = await prepareFetchForInputSource(req, mockFetch);
assert.strictEqual(passedFetchInput, req, 'fetch must receive the exact Request instance to preserve credentials/headers');
assert.strictEqual(prepared.filename, 'document.docx');

console.log('ALL 7 TELEGRAM INPUT SOURCE RESOLVER CHECKS PASSED SUCCESSFULLY!');
