import assert from 'node:assert/strict';
import { SecuritySandboxAndWebviewIsolationGovernor } from '../src/services/securitySandboxAndWebviewIsolationGovernor.ts';

console.log('🧪 Starting Phase 51 Security Sandbox, XSS Sanitization & Webview Verification Suite...');

// 1. Lottie JSON Prototype Pollution & DoS Sanitizer (AyuGram #259)
{
  console.log('  Testing Lottie prototype pollution and layer bounds...');
  // Malicious prototype pollution payload as raw wire JSON
  const pollutionPayload = '{"v":"5.5.7","__proto__":{"admin":true},"layers":[]}';
  const pollRes = SecuritySandboxAndWebviewIsolationGovernor.validateAndSanitizeLottieJson(pollutionPayload);
  assert.strictEqual(pollRes.isValid, false);
  assert.ok(pollRes.error?.includes('Prototype pollution detected'));

  // Excessive layer payload (600 layers > 500 limit)
  const excessiveLayers = JSON.stringify({
    v: '5.5.7',
    ip: 0,
    op: 60,
    layers: new Array(600).fill({ ind: 1 })
  });
  const layerRes = SecuritySandboxAndWebviewIsolationGovernor.validateAndSanitizeLottieJson(excessiveLayers);
  assert.strictEqual(layerRes.isValid, false);
  assert.ok(layerRes.error?.includes('Excessive layer count'));

  // Valid legitimate Lottie payload
  const validPayload = JSON.stringify({
    v: '5.5.7',
    ip: 0,
    op: 60,
    layers: [{ ind: 1, name: 'layer1' }]
  });
  const validRes = SecuritySandboxAndWebviewIsolationGovernor.validateAndSanitizeLottieJson(validPayload);
  assert.strictEqual(validRes.isValid, true);
  console.log('  ✅ Lottie JSON security validation verified');
}

// 2. Strict Webview Sandbox & Nonce CSP (TDesktop-x64 #220)
{
  console.log('  Testing Webview sandbox attributes & CSP headers...');
  const nonce = 'random_cryptographic_nonce_98765';
  const config = SecuritySandboxAndWebviewIsolationGovernor.generateWebviewSandboxConfig(nonce, true);

  assert.ok(config.sandboxAttribute.includes('allow-scripts'));
  assert.ok(config.sandboxAttribute.includes('allow-same-origin'));
  assert.ok(!config.sandboxAttribute.includes('allow-top-navigation'));
  assert.ok(!config.sandboxAttribute.includes('allow-modals'));

  assert.ok(config.contentSecurityPolicy.includes(`'nonce-${nonce}'`));
  assert.ok(config.contentSecurityPolicy.includes("object-src 'none'"));
  assert.strictEqual(config.allowCamera, true);
  assert.strictEqual(config.allowMicrophone, true);
  console.log('  ✅ Webview sandbox config verified');
}

// 3. Constant-Time Hash Comparison (tweb #16)
{
  console.log('  Testing constant-time comparison against timing attacks...');
  const secret = 'hash_super_secret_auth_token_2026';
  const identical = 'hash_super_secret_auth_token_2026';
  const different = 'hash_super_secret_auth_token_9999';

  assert.strictEqual(SecuritySandboxAndWebviewIsolationGovernor.constantTimeCompare(secret, identical), true);
  assert.strictEqual(SecuritySandboxAndWebviewIsolationGovernor.constantTimeCompare(secret, different), false);
  assert.strictEqual(SecuritySandboxAndWebviewIsolationGovernor.constantTimeCompare(secret, 'short'), false);
  console.log('  ✅ Constant-time comparison verified');
}

// 4. HTML Stored XSS Neutralizer
{
  console.log('  Testing HTML XSS neutralization...');
  const dirtyHtml = '<p>Hello <script>alert("xss")</script><img src="x" onerror="stealCookies()"> <a href="javascript:doEvil()">Click</a></p>';
  const cleanHtml = SecuritySandboxAndWebviewIsolationGovernor.sanitizeHtmlString(dirtyHtml);

  assert.ok(!cleanHtml.includes('<script>'));
  assert.ok(!cleanHtml.includes('onerror'));
  assert.ok(!cleanHtml.includes('javascript:'));
  assert.ok(cleanHtml.includes('Hello'));
  console.log('  ✅ HTML XSS neutralization verified');
}

// 5. Account Slot Ceiling (TDesktop-x64 #206)
{
  console.log('  Testing account slot limits...');
  const allowed = SecuritySandboxAndWebviewIsolationGovernor.checkAccountSlotAvailability(5);
  assert.strictEqual(allowed.canAdd, true);
  assert.strictEqual(allowed.maxSlots, 16);

  const blocked = SecuritySandboxAndWebviewIsolationGovernor.checkAccountSlotAvailability(16);
  assert.strictEqual(blocked.canAdd, false);
  assert.ok(blocked.error?.includes('Maximum account limit reached'));
  console.log('  ✅ Account slot limit verified');
}

console.log('✨ All Phase 51 Verification Tests Passed 100% Successfully!');
